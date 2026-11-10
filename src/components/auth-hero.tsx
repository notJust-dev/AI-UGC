import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { api } from '@convex/_generated/api';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from './ui/text';

/** Poster collage + headline used on the sign-in screens. */
export function AuthHero({ compact = false }: { compact?: boolean }) {
  const t = useTheme();
  const templates = useQuery(api.templates.list, { limit: 6 });
  const avatars = useQuery(api.avatars.listPublic);
  const posters = [
    ...(templates ?? []).map((x) => x.posterUrl),
    ...(avatars ?? []).map((a) => a.coverUrl),
  ].filter((u): u is string => !!u);
  const tiles = posters.length ? Array.from({ length: 6 }, (_, i) => posters[i % posters.length]) : [];

  return (
    <View style={styles.wrap}>
      <View style={[styles.collage, compact && styles.collageCompact]}>
        {tiles.map((uri, i) => (
          <View
            key={i}
            style={[
              styles.tile,
              { backgroundColor: t.surfaceMuted, transform: [{ translateY: i % 2 ? 28 : 0 }] },
            ]}>
            <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
        ))}
      </View>
      <View style={styles.copy}>
        <View style={[styles.badge, { backgroundColor: t.accentSoft }]}>
          <Text variant="label" tone="accent">
            AI UGC studio
          </Text>
        </View>
        <Text variant="display" style={styles.center}>
          Creator-style video ads, in minutes
        </Text>
        <Text variant="body" tone="secondary" style={styles.center}>
          Describe your idea, pick an AI creator, add your product, and get scroll-stopping videos.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.eight },
  collage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
    maxWidth: 360,
    minHeight: 120,
  },
  collageCompact: { maxWidth: 300 },
  tile: { width: 96, height: 170, borderRadius: Radius.md, overflow: 'hidden' },
  copy: { alignItems: 'center', gap: Spacing.three, maxWidth: 440, paddingHorizontal: Spacing.four },
  badge: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Radius.pill },
  center: { textAlign: 'center' },
});
