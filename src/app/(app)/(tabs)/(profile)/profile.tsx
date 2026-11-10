import { useAuth, useUser } from '@clerk/expo';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { api } from '@convex/_generated/api';
import { ListGroup, ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { usePaywall } from '@/hooks/use-buy-credits';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { purchasesSupported, restorePurchases, resetPurchases } from '@/lib/purchases';

export default function ProfileScreen() {
  const t = useTheme();
  const { gutter, isRegular } = useLayout();
  const { user } = useUser();
  const { signOut } = useAuth();
  const balance = useQuery(api.credits.balance);
  const avatars = useQuery(api.avatars.listMine);
  const products = useQuery(api.products.listMine);
  const paywall = usePaywall();
  const syncCredits = useAction(api.credits.sync);
  const deleteMyData = useMutation(api.users.deleteMyData);
  const [restoring, setRestoring] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName || email?.split('@')[0] || 'Your account';

  const confirmSignOut = () => {
    const go = async () => {
      await resetPurchases();
      await signOut();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out of AIUGC?')) go();
      return;
    }
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: go },
    ]);
  };

  const confirmDelete = () => {
    const message =
      'This permanently deletes your account, videos, avatars and products. Remaining credits are lost. This can’t be undone.';
    const go = async () => {
      try {
        await deleteMyData();
        await resetPurchases();
        await user?.delete();
      } catch (e) {
        const msg = errorMessage(e, "Couldn't delete your account. Please try again.");
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Not deleted', msg);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete your account?\n\n${message}`)) go();
      return;
    }
    Alert.alert('Delete your account?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete account', style: 'destructive', onPress: go },
    ]);
  };

  const restore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      await syncCredits().catch(() => undefined);
      Alert.alert('Purchases restored', 'Any credits and subscriptions on this account are active.');
    } catch {
      Alert.alert('Restore failed', 'Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Screen contentContainerStyle={{ paddingHorizontal: gutter, gap: Spacing.six }}>
      <View style={[styles.columns, isRegular && styles.columnsRegular]}>
        <View style={styles.column}>
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.userRow}>
              {user?.imageUrl ? (
                <Image source={user.imageUrl} style={styles.userImage} />
              ) : (
                <View style={[styles.userImage, { backgroundColor: t.surfaceMuted }]} />
              )}
              <View style={styles.flex}>
                <Text variant="headline" numberOfLines={1}>
                  {name}
                </Text>
                {email ? (
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    {email}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View
            style={[
              styles.card,
              styles.creditsCard,
              { backgroundColor: t.surface, borderColor: t.border },
            ]}>
            <View style={styles.creditsTop}>
              <View style={[styles.creditsIcon, { backgroundColor: t.accentSoft }]}>
                <Icon name="credits" color={t.accent} size={18} />
              </View>
              <View style={styles.flex}>
                <Text variant="label" tone="secondary">
                  Credits
                </Text>
                <Text variant="display" testID="profile-balance">
                  {balance ? balance.balance.toLocaleString() : '—'}
                </Text>
              </View>
            </View>
            {purchasesSupported ? (
              <View style={styles.creditButtons}>
                <Button title="Get credits" icon="credits" onPress={paywall.credits} style={styles.flex} />
                <Button title="Subscribe" icon="crown" kind="secondary" onPress={paywall.subscribe} style={styles.flex} />
              </View>
            ) : (
              <Text variant="caption" tone="secondary">
                Buy credits in the AIUGC app for iPhone or Android. Your balance syncs here automatically.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.column}>
          <ListGroup>
            <ListRow
              icon="person"
              title="My avatars"
              detail={avatars ? String(avatars.length) : undefined}
              onPress={() => router.push('/avatars')}
            />
            <ListRow
              icon="product"
              title="My products"
              detail={products ? String(products.length) : undefined}
              onPress={() => router.push('/products')}
            />
          </ListGroup>

          <ListGroup>
            <ListRow icon="profile" title="Account & security" onPress={() => router.push('/account')} />
            {purchasesSupported ? (
              <ListRow
                icon="restore"
                title={restoring ? 'Restoring…' : 'Restore purchases'}
                onPress={restore}
              />
            ) : null}
          </ListGroup>

          <ListGroup>
            <ListRow icon="logout" title="Sign out" destructive onPress={confirmSignOut} testID="sign-out" />
            <ListRow icon="trash" title="Delete account" destructive onPress={confirmDelete} testID="delete-account" />
          </ListGroup>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  columns: { gap: Spacing.six },
  columnsRegular: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, gap: Spacing.four },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.five },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  userImage: { width: 52, height: 52, borderRadius: 26 },
  creditsCard: { gap: Spacing.five },
  creditsTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  creditsIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  creditButtons: { flexDirection: 'row', gap: Spacing.three },
});
