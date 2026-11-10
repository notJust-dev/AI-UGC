import { UserProfile } from '@clerk/expo/web';
import { ScrollView } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AccountWeb() {
  const t = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={{ alignItems: 'center', padding: Spacing.six }}>
      <UserProfile routing="hash" appearance={{ variables: { colorPrimary: t.accent } }} />
    </ScrollView>
  );
}
