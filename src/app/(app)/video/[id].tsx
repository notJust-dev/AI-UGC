import { useMutation, useQuery } from 'convex/react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { DetailLayout } from '@/components/detail-layout';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VideoPlayer } from '@/components/video-player';
import { Radius, Spacing } from '@/constants/theme';
import { useComposer } from '@/hooks/use-composer';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { saveLabel, saveVideoToLibrary, shareVideo } from '@/lib/media';
import type { ModelId, Resolution } from '@convex/lib/models';

const PROGRESS: Record<string, { title: string; detail: string }> = {
  queued: { title: 'Getting ready', detail: 'Confirming credits and writing your prompt…' },
  starting: { title: 'Composing the first frame', detail: 'Placing your creator and product in the scene.' },
  submitted: { title: 'Rendering video', detail: 'This usually takes 1–4 minutes. You can leave this screen.' },
  finalizing: { title: 'Almost done', detail: 'Saving your video…' },
};

function notify(title: string, message?: string) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n${message}` : title);
  else Alert.alert(title, message);
}

export default function VideoScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: Id<'videos'> }>();
  const video = useQuery(api.videos.get, { id });
  const remove = useMutation(api.videos.remove);
  const { reset } = useComposer();
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);

  if (video === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <ActivityIndicator />
      </View>
    );
  }
  if (video === null) {
    return (
      <View style={[styles.center, { backgroundColor: t.background, padding: Spacing.six }]}>
        <EmptyState icon="warning" title="Video not found" action="Go back" onAction={() => router.back()} />
      </View>
    );
  }

  const progress = PROGRESS[video.status];
  const fileName = `aiugc-${video._id.slice(-6)}`;

  const save = async () => {
    if (!video.videoUrl) return;
    setBusy('save');
    try {
      const result = await saveVideoToLibrary(video.videoUrl, fileName);
      if (result === 'denied') notify('Allow Photos access', 'Enable photo library access in Settings to save videos.');
      else if (Platform.OS !== 'web') notify('Saved to Photos');
    } catch (e) {
      notify("Couldn't save the video", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (!video.videoUrl) return;
    setBusy('share');
    try {
      await shareVideo(video.videoUrl, fileName, 'My AIUGC video');
    } catch (e) {
      notify("Couldn't share the video", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const remix = () => {
    reset({
      prompt: video.prompt,
      avatarId: video.avatarId,
      productId: video.productId,
      modelId: (video.modelId ?? undefined) as ModelId | undefined,
      duration: video.duration,
      resolution: (video.resolution ?? undefined) as Resolution | undefined,
    });
    router.push('/create');
  };

  const confirmDelete = () => {
    const go = async () => {
      try {
        await remove({ id: video._id });
        router.back();
      } catch (e) {
        notify("Couldn't delete", errorMessage(e));
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this video? This can’t be undone.')) go();
      return;
    }
    Alert.alert('Delete this video?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: video.modelName }} />
      <DetailLayout
        media={(width) => (
          <VideoPlayer
            url={video.videoUrl}
            posterUrl={video.posterUrl}
            width={width}
            overlay={
              progress ? (
                <View style={[styles.progress, { backgroundColor: t.scrim }]}>
                  <ActivityIndicator color="#fff" />
                  <Text variant="headline" tone="inverse">
                    {progress.title}
                  </Text>
                  <Text variant="caption" tone="inverse" style={styles.centerText}>
                    {progress.detail}
                  </Text>
                </View>
              ) : video.status === 'failed' ? (
                <View style={[styles.progress, { backgroundColor: t.scrim }]}>
                  <Icon name="warning" color="#fff" size={26} />
                  <Text variant="headline" tone="inverse">
                    Couldn’t create this video
                  </Text>
                </View>
              ) : undefined
            }
          />
        )}>
        {video.siblings.length > 1 ? (
          <View style={styles.variants}>
            {video.siblings.map((s) => {
              const active = s._id === video._id;
              return (
                <Pressable
                  key={s._id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => !active && router.setParams({ id: s._id })}
                  style={[
                    styles.variant,
                    { backgroundColor: active ? t.accent : t.surfaceMuted },
                  ]}>
                  <Text variant="callout" tone={active ? 'onAccent' : 'primary'}>
                    Take {s.index + 1}
                  </Text>
                  {s.status === 'failed' ? (
                    <Icon name="warning" size={12} color={active ? t.onAccent : t.danger} />
                  ) : s.status !== 'completed' ? (
                    <ActivityIndicator size="small" color={active ? t.onAccent : t.textSecondary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {video.status === 'failed' ? (
          <View style={[styles.notice, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text variant="callout">{video.error ?? 'Rendering failed.'}</Text>
            {video.refunded && !/refunded/i.test(video.error ?? '') ? (
              <Text variant="caption" tone="secondary">
                Credits for this video were refunded.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={saveLabel}
            icon="download"
            onPress={save}
            loading={busy === 'save'}
            disabled={!video.videoUrl}
            style={styles.flex}
            testID="video-save"
          />
          <Button
            title="Share"
            icon="share"
            kind="secondary"
            onPress={share}
            loading={busy === 'share'}
            disabled={!video.videoUrl}
            style={styles.flex}
            testID="video-share"
          />
        </View>

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text variant="label" tone="secondary">
            Your idea
          </Text>
          <Text variant="body">{video.prompt}</Text>
          {video.enhancedPrompt ? (
            <>
              <Text variant="label" tone="secondary" style={styles.cardGap}>
                Enhanced prompt
              </Text>
              <Text variant="callout" tone="secondary">
                {video.enhancedPrompt}
              </Text>
            </>
          ) : null}
          <Text variant="caption" tone="tertiary" style={styles.cardGap}>
            {video.modelName} · {video.duration}s · {video.resolution}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="Remix" icon="remix" kind="secondary" onPress={remix} style={styles.flex} />
          <Button
            title="Delete"
            icon="trash"
            kind="danger"
            onPress={confirmDelete}
            disabled={!(video.status === 'completed' || video.status === 'failed')}
            style={styles.flex}
          />
        </View>
      </DetailLayout>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center', opacity: 0.9 },
  progress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.six,
  },
  variants: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  variant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  notice: { padding: Spacing.four, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.three },
  card: { padding: Spacing.five, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  cardGap: { marginTop: Spacing.three },
});
