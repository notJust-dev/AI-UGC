import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from './ui/text';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      {children}
      {hint ? (
        <Text variant="caption" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.textTertiary}
      {...props}
      style={[
        styles.input,
        props.multiline && styles.multiline,
        { color: t.text, backgroundColor: t.surface, borderColor: t.border },
        props.style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
  input: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
});
