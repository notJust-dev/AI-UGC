import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useIsDark, useTheme } from '@/hooks/use-theme';

const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

function useReduceTransparency() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduce).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  tint?: string;
};

/**
 * Liquid Glass on iOS 26+, a blur on older iOS, and a translucent surface on
 * Android / web or when Reduce Transparency is on.
 */
export function GlassSurface({ children, style, interactive, tint }: Props) {
  const theme = useTheme();
  const dark = useIsDark();
  const reduce = useReduceTransparency();

  if (liquidGlass && !reduce) {
    return (
      <GlassView
        style={style}
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tint}>
        {children}
      </GlassView>
    );
  }
  if (Platform.OS === 'ios' && !reduce) {
    return (
      <BlurView intensity={60} tint={dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={[styles.clip, style]}>
        {tint ? <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.6 }]} /> : null}
        {children}
      </BlurView>
    );
  }
  return (
    <View
      style={[
        styles.clip,
        {
          backgroundColor: tint ?? theme.glassFallback,
          borderColor: theme.border,
          borderWidth: StyleSheet.hairlineWidth,
        },
        Platform.OS === 'web' ? ({ backdropFilter: 'blur(20px)' } as ViewStyle) : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
