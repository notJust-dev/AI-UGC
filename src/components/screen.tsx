import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Scrolling screen body that sits under the glass header/tab bar and centers on wide screens. */
export function Screen({ children, contentContainerStyle, ...rest }: ScrollViewProps & { children: ReactNode }) {
  const t = useTheme();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: t.background }}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...rest}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.two,
    paddingBottom: Spacing.ten * 2,
    gap: Spacing.eight,
  },
});
