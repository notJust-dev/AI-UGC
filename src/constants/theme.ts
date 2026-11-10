import '@/global.css';

import { Platform } from 'react-native';

/** Design tokens. One accent (violet) for primary actions; everything else is neutral. */
export const Colors = {
  light: {
    text: '#0B0B0F',
    textSecondary: '#5B5E66',
    textTertiary: '#8D9099',
    background: '#F6F6F8',
    surface: '#FFFFFF',
    surfaceMuted: '#ECECF0',
    border: 'rgba(11,11,15,0.08)',
    accent: '#6D4AFF',
    accentSoft: 'rgba(109,74,255,0.12)',
    onAccent: '#FFFFFF',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    scrim: 'rgba(0,0,0,0.45)',
    glassFallback: 'rgba(255,255,255,0.82)',
  },
  dark: {
    text: '#F5F5F7',
    textSecondary: '#A1A3AB',
    textTertiary: '#6E7079',
    background: '#0B0B0F',
    surface: '#16161C',
    surfaceMuted: '#1F1F27',
    border: 'rgba(255,255,255,0.08)',
    accent: '#8B6DFF',
    accentSoft: 'rgba(139,109,255,0.18)',
    onAccent: '#FFFFFF',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#F87171',
    scrim: 'rgba(0,0,0,0.55)',
    glassFallback: 'rgba(22,22,28,0.82)',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  web: { sans: 'var(--font-display)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
  ten: 40,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Width at which layouts switch to regular (two-pane, wider grids): Duo open, tablets, desktop. */
export const REGULAR_WIDTH = 700;
export const MaxContentWidth = 1100;
