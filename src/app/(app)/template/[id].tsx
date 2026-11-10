import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import type { ModelId, Resolution } from '@convex/lib/models';
import { DetailLayout } from '@/components/detail-layout';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VideoPlayer } from '@/components/video-player';
import { Radius, Spacing } from '@/constants/theme';
import { useComposer } from '@/hooks/use-composer';
import { useTheme } from '@/hooks/use-theme';

export default function TemplateScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: Id<'templates'> }>();
  const template = useQuery(api.templates.get, { id });
  const { reset } = useComposer();

  if (template === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <ActivityIndicator />
      </View>
    );
  }
  if (template === null) {
    return (
      <View style={[styles.center, { backgroundColor: t.background, padding: Spacing.six }]}>
        <EmptyState icon="warning" title="Template not found" action="Go back" onAction={() => router.back()} />
      </View>
    );
  }

  const use = (swapCreator: boolean) => {
    reset({
      prompt: template.prompt,
      templateId: template._id,
      avatarId: swapCreator ? null : (template.avatar?._id ?? null),
      modelId: template.modelId as ModelId,
      duration: template.duration,
      resolution: template.resolution as Resolution,
    });
    router.push('/create');
    // Open the creator picker on top of the composer.
    if (swapCreator) setTimeout(() => router.push('/pick-avatar'), 350);
  };

  return (
    <>
      <Stack.Screen options={{ title: template.title }} />
      <DetailLayout
        media={(width) => <VideoPlayer url={template.videoUrl} posterUrl={template.posterUrl} width={width} />}>
        <View style={styles.header}>
          <Text variant="title">{template.title}</Text>
          {template.description ? (
            <Text variant="body" tone="secondary">
              {template.description}
            </Text>
          ) : null}
        </View>

        {template.avatar ? (
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            {template.avatar.coverUrl ? (
              <Image source={template.avatar.coverUrl} style={styles.avatar} contentFit="cover" />
            ) : null}
            <View style={styles.flex}>
              <Text variant="label" tone="secondary">
                Creator
              </Text>
              <Text variant="headline">{template.avatar.name}</Text>
            </View>
            <Text variant="caption" tone="tertiary">
              {template.modelName} · {template.duration}s
            </Text>
          </View>
        ) : null}

        <View style={styles.buttons}>
          <Button
            testID="template-use"
            title="Use this template"
            icon="remix"
            size="lg"
            onPress={() => use(false)}
          />
          <Button title="Use with a different creator" kind="secondary" onPress={() => use(true)} />
          <Text variant="caption" tone="tertiary" style={styles.centerText}>
            You can add your own product and edit the script on the next screen.
          </Text>
        </View>

        <View style={[styles.promptCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text variant="label" tone="secondary">
            Prompt
          </Text>
          <Text variant="callout" tone="secondary">
            {template.prompt}
          </Text>
        </View>
      </DetailLayout>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  header: { gap: Spacing.two },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  buttons: { gap: Spacing.three },
  promptCard: { padding: Spacing.five, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
});
