import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './ui/icon';
import { Text } from './ui/text';

type VideoStatus = 'queued' | 'starting' | 'submitted' | 'finalizing' | 'completed' | 'failed';

const STATUS_LABEL: Record<VideoStatus, string> = {
  queued: 'Queued',
  starting: 'Composing',
  submitted: 'Rendering',
  finalizing: 'Saving',
  completed: '',
  failed: 'Failed',
};

type Props = {
  href: Href;
  width: number;
  posterUrl: string | null;
  title?: string;
  subtitle?: string;
  status?: VideoStatus;
  testID?: string;
};

/** 9:16 poster tile used everywhere (library, templates, carousels). */
export function MediaCard({ href, width, posterUrl, title, subtitle, status, testID }: Props) {
  const t = useTheme();
  const busy = status && status !== 'completed' && status !== 'failed';
  const failed = status === 'failed';

  return (
    <Link href={href} asChild>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={[title, status ? STATUS_LABEL[status] : ''].filter(Boolean).join(', ')}
        style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}>
        <View
          style={[
            styles.frame,
            { width, height: (width * 16) / 9, backgroundColor: t.surfaceMuted },
          ]}>
          {posterUrl ? (
            <Image
              source={posterUrl}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={{ duration: 200, skipOnCacheHit: 'all' }}
              recyclingKey={posterUrl}
            />
          ) : null}
          {busy || failed ? (
            <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: t.scrim }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Icon name="warning" color="#fff" size={22} />}
              <Text variant="caption" tone="inverse" style={styles.overlayText}>
                {STATUS_LABEL[status!]}
              </Text>
            </View>
          ) : posterUrl && status === 'completed' ? (
            <View style={styles.playBadge}>
              <Icon name="play" size={12} color="#fff" />
            </View>
          ) : null}
        </View>
        {title ? (
          <Text variant="callout" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: Radius.lg, overflow: 'hidden', borderCurve: 'continuous' },
  overlay: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  overlayText: { fontWeight: '600' },
  playBadge: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  title: { marginTop: Spacing.two },
});
