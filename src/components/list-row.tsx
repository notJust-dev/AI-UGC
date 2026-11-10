import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './ui/icon';
import { Text } from './ui/text';

export function ListGroup({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <View style={[styles.group, { backgroundColor: t.surface, borderColor: t.border }]}>{children}</View>;
}

export function ListRow({
  icon,
  title,
  detail,
  onPress,
  destructive,
  testID,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
  testID?: string;
}) {
  const t = useTheme();
  const color = destructive ? t.danger : t.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surfaceMuted }]}>
      <View style={[styles.iconWrap, { backgroundColor: destructive ? 'transparent' : t.accentSoft }]}>
        <Icon name={icon} size={16} color={destructive ? t.danger : t.accent} />
      </View>
      <Text variant="body" style={[styles.title, { color }]}>
        {title}
      </Text>
      {detail ? (
        <Text variant="callout" tone="secondary">
          {detail}
        </Text>
      ) : null}
      {!destructive ? <Icon name="chevronRight" size={12} color={t.textTertiary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: Radius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    minHeight: 52,
  },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
});
