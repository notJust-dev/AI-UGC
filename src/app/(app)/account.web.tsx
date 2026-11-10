import { UserProfile } from '@clerk/expo/web';
import { ScrollView } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clerkAppearance } from '@/lib/clerk-appearance';

export default function AccountWeb() {
  const t = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={{ alignItems: 'center', padding: Spacing.six }}>
      <UserProfile routing="hash" appearance={clerkAppearance(t)} />
    </ScrollView>
  );
}
