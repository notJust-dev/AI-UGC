import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@convex/_generated/api';
import { EmptyState } from '@/components/empty-state';
import { MediaCard } from '@/components/media-card';
import { Screen } from '@/components/screen';
import { Carousel } from '@/components/section';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useComposer } from '@/hooks/use-composer';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

function CreateHero() {
  const t = useTheme();
  const { gutter, isRegular } = useLayout();
  const { reset } = useComposer();
  return (
    <View style={{ paddingHorizontal: gutter }}>
      <View
        style={[
          styles.hero,
          isRegular && styles.heroRegular,
          {
            experimental_backgroundImage: `linear-gradient(135deg, ${t.accent} 0%, #B455FF 55%, #FF7A8A 100%)`,
            backgroundColor: t.accent,
          },
        ]}>
        <View style={styles.heroCopy}>
          <Text variant="label" tone="inverse" style={styles.heroLabel}>
            AI UGC studio
          </Text>
          <Text variant="title" tone="inverse">
            Turn an idea into a creator video
          </Text>
          <Text variant="callout" tone="inverse" style={styles.heroSub}>
            Describe it, pick a creator, add your product.
          </Text>
        </View>
        <Button
          testID="home-generate"
          title="Generate video"
          icon="sparkles"
          size="lg"
          kind="secondary"
          style={styles.heroButton}
          onPress={() => {
            reset();
            router.push('/create');
          }}
        />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const videos = useQuery(api.videos.listMine, { limit: 12 });
  const templates = useQuery(api.templates.list, { limit: 12 });
  const avatars = useQuery(api.avatars.listPublic);
  const { reset } = useComposer();
  const t = useTheme();

  return (
    <Screen>
      <CreateHero />

      <Carousel
        title="Your videos"
        href="/library"
        data={videos}
        keyOf={(v) => v._id}
        empty={
          <EmptyState
            icon="library"
            title="No videos yet"
            message="Your generated videos will show up here."
          />
        }
        renderItem={(v, width) => (
          <MediaCard
            href={`/video/${v._id}`}
            width={width}
            posterUrl={v.posterUrl}
            status={v.status}
            subtitle={v.modelName}
          />
        )}
      />

      <Carousel
        title="Inspiration"
        href="/explore"
        data={templates}
        keyOf={(x) => x._id}
        empty={<EmptyState icon="explore" title="Inspiration is on its way" />}
        renderItem={(x, width) => (
          <MediaCard
            href={`/template/${x._id}`}
            width={width}
            posterUrl={x.posterUrl}
            status="completed"
            title={x.title}
            subtitle={x.avatar?.name}
          />
        )}
      />

      <Carousel
        title="AI creators"
        data={avatars}
        keyOf={(a) => a._id}
        renderItem={(a, width) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Create a video with ${a.name}`}
            onPress={() => {
              reset({ avatarId: a._id });
              router.push('/create');
            }}
            style={({ pressed }) => [{ width: width * 0.75, opacity: pressed ? 0.85 : 1 }]}>
            <View style={[styles.avatar, { width: width * 0.75, backgroundColor: t.surfaceMuted }]}>
              {a.coverUrl ? (
                <Image source={a.coverUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : null}
            </View>
            <Text variant="callout" style={styles.avatarName}>
              {a.name}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.six,
    gap: Spacing.six,
    overflow: 'hidden',
  },
  heroRegular: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCopy: { gap: Spacing.two, flexShrink: 1 },
  heroLabel: { opacity: 0.85 },
  heroSub: { opacity: 0.9 },
  heroButton: { alignSelf: 'flex-start' },
  avatar: { aspectRatio: 3 / 4, borderRadius: Radius.lg, overflow: 'hidden' },
  avatarName: { marginTop: Spacing.two },
});
