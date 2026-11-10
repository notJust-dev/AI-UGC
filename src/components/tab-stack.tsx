import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { CreditsPill } from './credits-pill';

/** Per-tab stack: large title + glass header on iOS, credits in the header. Web has its own top bar. */
export function TabStack({ name, title }: { name: string; title: string }) {
  const web = Platform.OS === 'web';
  return (
    <Stack>
      <Stack.Screen
        name={name}
        options={{
          title,
          headerShown: !web,
          headerLargeTitle: Platform.OS === 'ios',
          headerTransparent: Platform.OS === 'ios',
          headerShadowVisible: false,
          headerRight: () => <CreditsPill bare={Platform.OS === 'ios'} />,
        }}
      />
    </Stack>
  );
}
