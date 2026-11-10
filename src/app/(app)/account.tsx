import { UserProfileView } from '@clerk/expo/native-components';
import { router } from 'expo-router';

/** Clerk's native account screen (profile, email, connected accounts, sign out, delete). */
export default function AccountScreen() {
  return <UserProfileView style={{ flex: 1 }} isDismissible onDismiss={() => router.back()} />;
}
