import { useAction, useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { MAX_PROMPT_LENGTH, MAX_VARIATIONS, MODEL_LIST, quote, VIDEO_MODELS } from '@convex/lib/models';
import { ReferenceRow } from '@/components/reference-row';
import { Button } from '@/components/ui/button';
import { GlassSurface } from '@/components/ui/glass';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useBuyCredits } from '@/hooks/use-buy-credits';
import { useComposer } from '@/hooks/use-composer';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage, insufficientCredits } from '@/lib/errors';

const newRequestId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function notify(title: string, message?: string, buttons?: Parameters<typeof Alert.alert>[2]) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n${message}` : title);
    return;
  }
  Alert.alert(title, message, buttons);
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="label" tone="secondary">
          {title}
        </Text>
        {hint ? (
          <Text variant="caption" tone="tertiary">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function CreateScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { isRegular, gutter } = useLayout();
  const { state, update, setModel } = useComposer();
  const buyCredits = useBuyCredits();

  const avatar = useQuery(api.avatars.get, state.avatarId ? { id: state.avatarId } : 'skip');
  const product = useQuery(api.products.get, state.productId ? { id: state.productId } : 'skip');
  const balance = useQuery(api.credits.balance);
  const enhance = useAction(api.pipeline.enhance);
  const create = useMutation(api.generations.create);

  const [enhancing, setEnhancing] = useState(false);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generationId, setGenerationId] = useState<Id<'generations'> | null>(null);
  const requestId = useRef(newRequestId());
  const alertedFor = useRef<string | null>(null);

  // After create: wait for the server-side charge, then open the video.
  const generation = useQuery(api.generations.get, generationId ? { id: generationId } : 'skip');
  const waiting = !!generationId && (generation === undefined || generation?.status === 'charging');

  const model = VIDEO_MODELS[state.modelId];
  const q = useMemo(() => quote(state), [state]);
  const cost = q.ok ? q.total : 0;
  const notEnough = balance !== undefined && balance !== null && balance.balance < cost;
  const busy = submitting || waiting;
  const canSubmit = state.prompt.trim().length >= 3 && q.ok && !busy;

  // A different request (settings changed) must not be deduplicated with the last one.
  useEffect(() => {
    requestId.current = newRequestId();
  }, [state]);

  useEffect(() => {
    if (!generation) return;
    if (generation.status === 'rejected') {
      if (alertedFor.current === generation._id) return;
      alertedFor.current = generation._id;
      requestId.current = newRequestId();
      notify('Not enough credits', `This video needs ${generation.creditsTotal} credits.`, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Get credits', onPress: buyCredits },
      ]);
      return;
    }
    if (generation.status === 'charged' || generation.status === 'chargeUnknown') {
      const first = generation.videos[0];
      if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (first) router.replace(`/video/${first._id}`);
    }
  }, [generation, buyCredits]);

  // Don't leave the user waiting if billing is slow: open the video anyway.
  useEffect(() => {
    if (!generationId || !generation) return;
    const timer = setTimeout(() => {
      const first = generation.videos[0];
      if (first) router.replace(`/video/${first._id}`);
    }, 10_000);
    return () => clearTimeout(timer);
  }, [generationId, generation]);

  const onEnhance = async () => {
    setEnhancing(true);
    try {
      const enhanced = await enhance({
        prompt: state.prompt,
        duration: state.duration,
        avatarId: state.avatarId ?? undefined,
        productId: state.productId ?? undefined,
      });
      setPreviousPrompt(state.prompt);
      update({ prompt: enhanced });
    } catch (e) {
      notify("Couldn't enhance", errorMessage(e));
    } finally {
      setEnhancing(false);
    }
  };

  const onGenerate = async () => {
    if (!canSubmit) return;
    if (notEnough) {
      notify('Not enough credits', `This video needs ${cost} credits. You have ${balance?.balance ?? 0}.`, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Get credits', onPress: buyCredits },
      ]);
      return;
    }
    setSubmitting(true);
    try {
      const id = await create({
        clientRequestId: requestId.current,
        prompt: state.prompt,
        avatarId: state.avatarId ?? undefined,
        productId: state.productId ?? undefined,
        templateId: state.templateId ?? undefined,
        modelId: state.modelId,
        resolution: state.resolution,
        duration: state.duration,
        variations: state.variations,
      });
      setGenerationId(id);
      setSubmitting(false);
    } catch (e) {
      setSubmitting(false);
      const short = insufficientCredits(e);
      if (short) {
        notify('Not enough credits', `This video needs ${short.needed} credits. You have ${short.balance}.`, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Get credits', onPress: buyCredits },
        ]);
      } else {
        notify("Couldn't start the video", errorMessage(e));
      }
    }
  };

  const promptBlock = (
    <Section title="Describe your video" hint={`${state.prompt.length}/${MAX_PROMPT_LENGTH}`}>
      <View style={[styles.promptBox, { backgroundColor: t.surface, borderColor: t.border }]}>
        <TextInput
          testID="prompt-input"
          value={state.prompt}
          onChangeText={(prompt) => {
            setPreviousPrompt(null);
            update({ prompt });
          }}
          placeholder="e.g. A creator unboxes our new protein bar in her kitchen and says it's the only snack that keeps her full until lunch."
          placeholderTextColor={t.textTertiary}
          multiline
          maxLength={MAX_PROMPT_LENGTH}
          style={[styles.promptInput, { color: t.text }]}
          textAlignVertical="top"
        />
        <View style={styles.promptActions}>
          {previousPrompt !== null ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                update({ prompt: previousPrompt });
                setPreviousPrompt(null);
              }}
              hitSlop={8}>
              <Text variant="callout" tone="secondary">
                Undo
              </Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Button
            testID="enhance"
            title="Enhance"
            icon="sparkles"
            kind="secondary"
            loading={enhancing}
            disabled={state.prompt.trim().length < 3}
            onPress={onEnhance}
          />
        </View>
      </View>
    </Section>
  );

  const referencesBlock = (
    <Section title="Creator & product" hint="Optional">
      <ReferenceRow
        testID="choose-avatar"
        label="Creator"
        emptyLabel="Choose an AI creator"
        icon="person"
        name={avatar?.name}
        imageUrl={avatar?.coverUrl}
        onPress={() => router.push('/pick-avatar')}
        onClear={() => update({ avatarId: null })}
      />
      <ReferenceRow
        testID="choose-product"
        label="Product"
        emptyLabel="Add your product"
        icon="product"
        name={product?.name}
        imageUrl={product?.imageUrls[0]}
        onPress={() => router.push('/pick-product')}
        onClear={() => update({ productId: null })}
      />
    </Section>
  );

  const settingsBlock = (
    <>
      <Section title="Model">
        <ScrollView
          horizontal={!isRegular}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={isRegular ? styles.modelGrid : styles.modelRow}>
          {MODEL_LIST.map((m) => {
            const active = m.id === state.modelId;
            return (
              <Pressable
                key={m.id}
                testID={`model-${m.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setModel(m.id)}
                style={[
                  styles.model,
                  isRegular && styles.modelRegular,
                  {
                    backgroundColor: active ? t.accentSoft : t.surface,
                    borderColor: active ? t.accent : t.border,
                  },
                ]}>
                <View style={styles.modelTop}>
                  <Text variant="headline">{m.name}</Text>
                  {active ? <Icon name="checkCircle" size={16} color={t.accent} /> : null}
                </View>
                <Text variant="caption" tone="secondary" numberOfLines={2}>
                  {m.tagline}
                </Text>
                <View style={styles.modelPrice}>
                  <Icon name="credits" size={11} color={t.accent} />
                  <Text variant="caption" tone="accent">
                    from {Math.min(...m.resolutions.map((r) => m.creditsPerSecond[r]))}/sec
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Section>

      <Section title="Length">
        <Segmented
          testID="duration"
          options={model.durations}
          value={state.duration}
          onChange={(duration) => update({ duration })}
          format={(d) => `${d}s`}
        />
      </Section>

      {model.resolutions.length > 1 ? (
        <Section title="Quality">
          <Segmented
            options={model.resolutions}
            value={state.resolution}
            onChange={(resolution) => update({ resolution })}
          />
        </Section>
      ) : null}

      <Section title="Variations" hint="Different takes of the same idea">
        <Segmented
          testID="variations"
          options={Array.from({ length: MAX_VARIATIONS }, (_, i) => i + 1)}
          value={state.variations}
          onChange={(variations) => update({ variations })}
        />
      </Section>
    </>
  );

  const actionBar = (
    <GlassSurface style={[styles.actionBar, { marginBottom: insets.bottom + Spacing.two }]}>
      <View style={styles.cost}>
        <View style={styles.costRow}>
          <Icon name="credits" size={14} color={t.accent} />
          <Text variant="headline" testID="cost">
            {cost} credits
          </Text>
        </View>
        <Text variant="caption" tone={notEnough ? 'danger' : 'secondary'}>
          {balance ? `Balance ${balance.balance}` : 'Checking balance…'}
        </Text>
      </View>
      <Button
        testID="generate"
        title={notEnough ? 'Get credits' : 'Generate'}
        icon={notEnough ? 'credits' : 'sparkles'}
        size="lg"
        loading={busy}
        disabled={!canSubmit && !notEnough}
        onPress={notEnough ? buyCredits : onGenerate}
      />
    </GlassSurface>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: gutter, paddingBottom: 140 + insets.bottom },
        ]}>
        {isRegular ? (
          <View style={styles.columns}>
            <View style={styles.column}>
              {promptBlock}
              {referencesBlock}
            </View>
            <View style={styles.column}>{settingsBlock}</View>
          </View>
        ) : (
          <>
            {promptBlock}
            {referencesBlock}
            {settingsBlock}
          </>
        )}
      </ScrollView>
      <View style={[styles.actionWrap, { paddingHorizontal: gutter }]} pointerEvents="box-none">
        {actionBar}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.six, paddingTop: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  columns: { flexDirection: 'row', gap: Spacing.eight },
  column: { flex: 1, gap: Spacing.six },
  section: { gap: Spacing.three },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  promptBox: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.four, gap: Spacing.three },
  promptInput: { minHeight: 140, fontSize: 16, lineHeight: 22, padding: 0 },
  promptActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modelRow: { gap: Spacing.three },
  modelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  model: {
    width: 180,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing.one,
  },
  modelRegular: { width: '48%' },
  modelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modelPrice: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.one },
  actionWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  actionBar: {
    width: '100%',
    maxWidth: 560,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.four,
    paddingLeft: Spacing.five,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  cost: { gap: 2 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
