import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';

import { Icon } from './ui/icon';
import { Text } from './ui/text';
import { useTheme } from '@/hooks/use-theme';

export function SectionHeader({ title, href }: { title: string; href?: Href }) {
  const { gutter } = useLayout();
  const t = useTheme();
  return (
    <View style={[styles.header, { paddingHorizontal: gutter }]}>
      <Text variant="title" style={styles.headerTitle}>
        {title}
      </Text>
      {href ? (
        <Link href={href} asChild>
          <Pressable accessibilityRole="link" hitSlop={10} style={styles.viewAll}>
            <Text variant="callout" tone="accent">
              View all
            </Text>
            <Icon name="chevronRight" size={12} color={t.accent} />
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

/** Horizontal carousel with a "View all" link. */
export function Carousel<T>({
  title,
  href,
  data,
  keyOf,
  renderItem,
  empty,
}: {
  title: string;
  href?: Href;
  data: T[] | undefined;
  keyOf: (item: T) => string;
  renderItem: (item: T, width: number) => ReactNode;
  empty?: ReactNode;
}) {
  const { gutter, carouselItemWidth } = useLayout();
  return (
    <View style={styles.section}>
      <SectionHeader title={title} href={data && data.length > 0 ? href : undefined} />
      {data && data.length === 0 && empty ? (
        <View style={{ paddingHorizontal: gutter }}>{empty}</View>
      ) : (
        <FlatList
          horizontal
          data={data ?? []}
          keyExtractor={keyOf}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: gutter, gap: Spacing.three }}
          renderItem={({ item }) => <>{renderItem(item, carouselItemWidth)}</>}
          ListEmptyComponent={
            data === undefined ? (
              <View style={{ flexDirection: 'row', gap: Spacing.three }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} width={carouselItemWidth} />
                ))}
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
}

export function Skeleton({ width }: { width: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        width,
        height: (width * 16) / 9,
        borderRadius: 20,
        backgroundColor: t.surfaceMuted,
      }}
    />
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, lineHeight: 26 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
