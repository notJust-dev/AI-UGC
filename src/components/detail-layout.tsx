import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

/**
 * Media + details. Compact: stacked. Regular (Duo open, iPad, desktop): side by side.
 * `media` receives the width it should render at.
 */
export function DetailLayout({
  media,
  children,
}: {
  media: (width: number) => ReactNode;
  children: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height, isRegular, gutter } = useLayout();

  // Keep the 9:16 player within the viewport height.
  const maxByHeight = ((height - insets.top - insets.bottom - 120) * 9) / 16;
  const mediaWidth = isRegular
    ? Math.min(420, maxByHeight, (Math.min(width, MaxContentWidth) - gutter * 3) / 2)
    : Math.min(width - gutter * 2, Math.max(260, maxByHeight));

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: gutter, paddingBottom: insets.bottom + Spacing.ten },
        isRegular && styles.contentRegular,
      ]}>
      <View>{media(mediaWidth)}</View>
      <View style={[styles.details, isRegular && { maxWidth: 520 }]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.six,
    paddingTop: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  contentRegular: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.eight },
  details: { flex: 1, gap: Spacing.five, width: '100%' },
});
