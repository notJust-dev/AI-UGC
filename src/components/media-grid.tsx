import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';

import { Skeleton } from './section';

/** Responsive grid of 9:16 tiles; column count follows the window width. */
export function MediaGrid<T>({
  data,
  keyOf,
  renderItem,
  empty,
}: {
  data: T[] | undefined;
  keyOf: (item: T) => string;
  renderItem: (item: T, width: number) => ReactNode;
  empty?: ReactNode;
}) {
  const { gutter, gridItemWidth, gridColumns } = useLayout();
  if (data && data.length === 0) return <View style={{ paddingHorizontal: gutter }}>{empty}</View>;
  return (
    <View style={[styles.grid, { paddingHorizontal: gutter }]}>
      {data
        ? data.map((item) => (
            <View key={keyOf(item)} style={{ width: gridItemWidth }}>
              {renderItem(item, gridItemWidth)}
            </View>
          ))
        : Array.from({ length: gridColumns * 2 }, (_, i) => <Skeleton key={i} width={gridItemWidth} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, rowGap: Spacing.five },
});
