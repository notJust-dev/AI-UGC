import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './ui/icon';
import { Text } from './ui/text';

/** Tappable row showing the chosen creator/product (or a prompt to choose one). */
export function ReferenceRow({
  label,
  emptyLabel,
  icon,
  name,
  imageUrl,
  onPress,
  onClear,
  testID,
}: {
  label: string;
  emptyLabel: string;
  icon: IconName;
  name?: string | null;
  imageUrl?: string | null;
  onPress: () => void;
  onClear?: () => void;
  testID?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={name ? `${label}: ${name}. Change` : emptyLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: t.surface, borderColor: t.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={[styles.thumb, { backgroundColor: t.accentSoft }]}>
        {imageUrl ? (
          <Image source={imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Icon name={icon} color={t.accent} size={18} />
        )}
      </View>
      <View style={styles.text}>
        <Text variant="label" tone="secondary">
          {label}
        </Text>
        <Text variant="headline" numberOfLines={1} tone={name ? 'primary' : 'accent'}>
          {name ?? emptyLabel}
        </Text>
      </View>
      {name && onClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label.toLowerCase()}`}
          onPress={onClear}
          hitSlop={10}
          style={[styles.clear, { backgroundColor: t.surfaceMuted }]}>
          <Icon name="close" size={12} color={t.textSecondary} />
        </Pressable>
      ) : (
        <Icon name="chevronRight" size={12} color={t.textTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 48, height: 48, borderRadius: Radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  clear: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
