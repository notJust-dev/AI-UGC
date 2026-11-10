import { SignIn } from '@clerk/expo/web';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AuthHero } from '@/components/auth-hero';
import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

export default function SignInWeb() {
  const t = useTheme();
  const { isRegular } = useLayout();
  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={[styles.page, isRegular && styles.pageRegular]}>
      <View style={styles.hero}>
        <AuthHero compact={!isRegular} />
      </View>
      <View style={styles.form}>
        <SignIn
          routing="hash"
          appearance={{ variables: { colorPrimary: t.accent, borderRadius: '14px' } }}
        />
        {/* Required by Clerk bot protection on web sign-up. */}
        <View nativeID="clerk-captcha" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.eight, padding: Spacing.six },
  pageRegular: { flexDirection: 'row', gap: Spacing.ten },
  hero: { flexShrink: 1, maxWidth: 520 },
  form: { alignItems: 'center' },
});
