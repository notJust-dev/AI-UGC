import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';

/** Native tab bar: Liquid Glass on iOS 26+, Material on Android; sidebar on large iPhones/iPad. */
export default function TabsLayout() {
  const t = useTheme();
  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={t.accent} sidebarAdaptable>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(explore)">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'sparkles.rectangle.stack', selected: 'sparkles.rectangle.stack.fill' }}
          md="explore"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(library)">
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'play.rectangle.on.rectangle', selected: 'play.rectangle.on.rectangle.fill' }}
          md="video_library"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(profile)">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
