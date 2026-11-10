import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from './text';

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  format = String,
  testID,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
  testID?: string;
}) {
  const t = useTheme();
  return (
    <View testID={testID} style={[styles.track, { backgroundColor: t.surfaceMuted }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={String(o)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              if (Platform.OS === 'ios') Haptics.selectionAsync();
              onChange(o);
            }}
            style={[styles.item, active && [styles.active, { backgroundColor: t.surface }]]}>
            <Text variant="callout" tone={active ? 'primary' : 'secondary'}>
              {format(o)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: Radius.pill, padding: 3 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.two, borderRadius: Radius.pill },
  active: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
