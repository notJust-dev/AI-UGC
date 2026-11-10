import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useComposer } from '@/hooks/use-composer';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

export default function AvatarsScreen() {
  const t = useTheme();
  const { gutter, gridItemWidth } = useLayout();
  const avatars = useQuery(api.avatars.listMine);
  const remove = useMutation(api.avatars.remove);
  const { state, update, reset } = useComposer();
  const add = () => router.push('/avatars/new');

  const confirmDelete = (id: Id<'avatars'>, name: string) => {
    const go = async () => {
      await remove({ id });
      if (state.avatarId === id) update({ avatarId: null });
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${name}?`)) go();
      return;
    }
    Alert.alert(`Delete ${name}?`, 'Its photos are deleted. Videos you already made are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <Button title="Add" kind="ghost" onPress={add} /> }} />
      <ScrollView
        style={{ backgroundColor: t.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}>
        {avatars?.length === 0 ? (
          <EmptyState
            icon="person"
            title="No avatars yet"
            message="Create an avatar from 1–4 photos of yourself or someone who agreed to it."
            action="Create avatar"
            onAction={add}
          />
        ) : null}
        <View style={styles.grid}>
          {(avatars ?? []).map((a) => (
            <View key={a._id} style={{ width: gridItemWidth }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Create a video with ${a.name}`}
                onPress={() => {
                  reset({ avatarId: a._id });
                  router.push('/create');
                }}>
                <View style={[styles.tile, { width: gridItemWidth, height: (gridItemWidth * 4) / 3, backgroundColor: t.surfaceMuted }]}>
                  {a.coverUrl ? <Image source={a.coverUrl} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                </View>
              </Pressable>
              <View style={styles.footer}>
                <Text variant="callout" numberOfLines={1} style={styles.flex}>
                  {a.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${a.name}`}
                  hitSlop={10}
                  onPress={() => confirmDelete(a._id, a.name)}>
                  <Icon name="trash" size={16} color={t.textSecondary} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingVertical: Spacing.four, gap: Spacing.four },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, rowGap: Spacing.five },
  tile: { borderRadius: Radius.lg, overflow: 'hidden' },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.two, gap: Spacing.two },
});
