import { Link } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { CreditsPill } from '@/components/credits-pill';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

const TABS: { name: string; href: '/' | '/explore' | '/library' | '/profile'; label: string; icon: IconName }[] = [
  { name: '(home)', href: '/', label: 'Home', icon: 'home' },
  { name: '(explore)', href: '/explore', label: 'Explore', icon: 'explore' },
  { name: '(library)', href: '/library', label: 'Library', icon: 'library' },
  { name: '(profile)', href: '/profile', label: 'Profile', icon: 'profile' },
];

function TabButton({
  isFocused,
  label,
  icon,
  ref: _ref,
  ...props
}: TabTriggerSlotProps & { label: string; icon: IconName }) {
  const t = useTheme();
  const { isRegular } = useLayout();
  return (
    <Pressable
      {...props}
      style={[styles.tab, isFocused && { backgroundColor: t.accentSoft }]}>
      <Icon name={icon} size={18} color={isFocused ? t.accent : t.textSecondary} />
      {isRegular ? (
        <Text variant="callout" style={{ color: isFocused ? t.accent : t.textSecondary }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Web: top bar with brand, tabs, credits and a primary Create button. */
export default function WebTabsLayout() {
  const t = useTheme();
  const { isRegular } = useLayout();
  return (
    <Tabs>
      <TabList asChild>
        <View style={[styles.bar, { backgroundColor: t.glassFallback, borderColor: t.border }]}>
          <View style={styles.inner}>
            <Text variant="headline" style={styles.brand}>
              AIUGC
            </Text>
            <View style={styles.tabs}>
              {TABS.map((tab) => (
                <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
                  <TabButton label={tab.label} icon={tab.icon} />
                </TabTrigger>
              ))}
            </View>
            <View style={styles.right}>
              <CreditsPill bare />
              <Link href="/create" asChild>
                <Pressable style={[styles.create, { backgroundColor: t.accent }]}>
                  <Icon name="create" size={16} color={t.onAccent} />
                  {isRegular ? (
                    <Text variant="callout" tone="onAccent">
                      Create
                    </Text>
                  ) : null}
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </TabList>
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backdropFilter: 'blur(20px)',
    zIndex: 10,
  } as never,
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  brand: { fontWeight: '800', letterSpacing: -0.4 },
  tabs: { flexDirection: 'row', gap: Spacing.one, flex: 1 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});
