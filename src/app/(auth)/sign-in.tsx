import { useAuth } from '@clerk/expo';
import { AuthView } from '@clerk/expo/native-components';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthHero } from '@/components/auth-hero';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

export default function SignInScreen() {
  const t = useTheme();
  const { isSignedIn, signOut } = useAuth({ treatPendingAsSignedOut: false });
  const { isRegular } = useLayout();
  const [open, setOpen] = useState(false);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={[styles.content, isRegular && styles.contentRegular]}>
        <AuthHero />
        <View style={styles.actions}>
          {isSignedIn ? (
            <>
              <Text variant="callout" tone="secondary" style={styles.center}>
                {"Signed in, but we couldn't connect to AIUGC. Check your connection."}
              </Text>
              <Button title="Sign out" kind="secondary" onPress={() => signOut()} />
            </>
          ) : (
            <>
              <Button
                testID="get-started"
                title="Get started"
                size="lg"
                onPress={() => setOpen(true)}
              />
              <Text variant="caption" tone="tertiary" style={styles.center}>
                By continuing you agree to the Terms and Privacy Policy.
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Clerk's native sign-in / sign-up UI (Apple, Google, email code). */}
      <Modal
        visible={open && !isSignedIn}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}>
        <AuthView mode="signInOrUp" isDismissible onDismiss={() => setOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.ten,
    gap: Spacing.ten,
  },
  contentRegular: { paddingHorizontal: Spacing.ten },
  actions: { gap: Spacing.three, paddingHorizontal: Spacing.six, alignSelf: 'center', width: '100%', maxWidth: 420 },
  center: { textAlign: 'center' },
});
