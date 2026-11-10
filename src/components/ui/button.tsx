import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress?: () => void;
  kind?: Kind;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  size = 'md',
  style,
  accessibilityLabel,
  testID,
}: Props) {
  const t = useTheme();
  const inactive = disabled || loading;
  const bg = {
    primary: t.accent,
    secondary: t.surfaceMuted,
    ghost: 'transparent',
    danger: t.surfaceMuted,
  }[kind];
  const fg = { primary: t.onAccent, secondary: t.text, ghost: t.accent, danger: t.danger }[kind];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: bg, opacity: inactive ? 0.5 : pressed ? 0.82 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} color={fg} size={size === 'lg' ? 20 : 17} /> : null}
          <Text variant="headline" style={{ color: fg }}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  md: { minHeight: 44, paddingHorizontal: Spacing.five },
  lg: { minHeight: 56, paddingHorizontal: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
