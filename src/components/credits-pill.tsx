import { useQuery } from 'convex/react';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@convex/_generated/api';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBuyCredits } from '@/hooks/use-buy-credits';

import { GlassSurface } from './ui/glass';
import { Icon } from './ui/icon';
import { Text } from './ui/text';

/** Glass capsule with the live credit balance. Tapping opens the credit paywall. */
export function CreditsPill({ bare = false }: { bare?: boolean }) {
  const t = useTheme();
  const balance = useQuery(api.credits.balance);
  const buy = useBuyCredits();
  const value = balance?.balance;

  const content = (
    <View style={styles.row}>
      <Icon name="credits" size={14} color={t.accent} />
      <Text variant="callout" style={styles.value}>
        {value === undefined ? '—' : value.toLocaleString()}
      </Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value ?? 0} credits. Get more credits`}
      testID="credits-pill"
      onPress={buy}
      hitSlop={8}>
      {bare ? (
        <View style={styles.pad}>{content}</View>
      ) : (
        <GlassSurface interactive style={styles.pill}>
          {content}
        </GlassSurface>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: Radius.pill },
  pad: { paddingHorizontal: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  value: { fontVariant: ['tabular-nums'] },
});
