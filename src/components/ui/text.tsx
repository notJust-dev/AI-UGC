import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'display' | 'title' | 'headline' | 'body' | 'callout' | 'caption' | 'label';
type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'onAccent' | 'inverse';

const variants: Record<Variant, TextStyle> = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 17 },
  label: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
};

export function Text({
  variant = 'body',
  tone = 'primary',
  style,
  ...rest
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const t = useTheme();
  const color = {
    primary: t.text,
    secondary: t.textSecondary,
    tertiary: t.textTertiary,
    accent: t.accent,
    danger: t.danger,
    onAccent: t.onAccent,
    inverse: '#FFFFFF',
  }[tone];
  return (
    <RNText
      {...rest}
      style={[{ color, fontFamily: Fonts?.sans }, variants[variant], style]}
    />
  );
}
