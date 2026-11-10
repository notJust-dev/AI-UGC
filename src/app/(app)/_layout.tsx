import { useAuth } from '@clerk/expo';
import { useAction } from 'convex/react';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { api } from '@convex/_generated/api';
import { ComposerProvider } from '@/hooks/use-composer';
import { configurePurchases, resetPurchases } from '@/lib/purchases';

/** RevenueCat customer = Clerk user id, so server-side spends hit the same balance. */
function usePurchasesIdentity() {
  const { userId } = useAuth();
  const sync = useAction(api.credits.sync);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      await configurePurchases(userId).catch((e) => console.warn('RevenueCat setup failed', e));
      if (!cancelled) await sync().catch(() => undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sync]);

  useEffect(() => () => void resetPurchases(), []);
}

const sheet = {
  presentation: 'formSheet' as const,
  sheetAllowedDetents: [0.65, 1],
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
  headerShown: true,
};

export default function AppLayout() {
  usePurchasesIdentity();
  const modal = Platform.OS === 'web' ? ('card' as const) : ('modal' as const);

  return (
    <ComposerProvider>
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={{ presentation: modal, title: 'New video' }} />
        <Stack.Screen name="pick-avatar" options={{ ...sheet, title: 'Choose a creator' }} />
        <Stack.Screen name="pick-product" options={{ ...sheet, title: 'Choose a product' }} />
        <Stack.Screen name="avatars/new" options={{ presentation: modal, title: 'New avatar' }} />
        <Stack.Screen name="products/new" options={{ presentation: modal, title: 'New product' }} />
        <Stack.Screen name="products/[id]" options={{ presentation: modal, title: 'Edit product' }} />
        <Stack.Screen name="video/[id]" options={{ title: '', headerTransparent: true }} />
        <Stack.Screen name="template/[id]" options={{ title: '', headerTransparent: true }} />
        <Stack.Screen name="avatars/index" options={{ title: 'My avatars' }} />
        <Stack.Screen name="products/index" options={{ title: 'My products' }} />
        <Stack.Screen name="account" options={{ headerShown: false, presentation: modal }} />
      </Stack>
    </ComposerProvider>
  );
}
