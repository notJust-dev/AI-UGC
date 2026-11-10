import type { ThemeColors } from '@/constants/theme';

/** Clerk web component styling that follows the app's light/dark tokens. */
export function clerkAppearance(t: ThemeColors) {
  return {
    variables: {
      colorPrimary: t.accent,
      colorBackground: t.surface,
      colorText: t.text,
      colorTextSecondary: t.textSecondary,
      colorInputBackground: t.surfaceMuted,
      colorInputText: t.text,
      colorNeutral: t.text,
      borderRadius: '14px',
      fontFamily: 'Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif',
    },
  };
}
