import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useComposer } from '@/hooks/use-composer';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

type Avatar = { _id: Id<'avatars'>; name: string; coverUrl: string | null };

export default function PickAvatarSheet() {
  const t = useTheme();
  const { width } = useLayout();
  const { state, update } = useComposer();
  const catalog = useQuery(api.avatars.listPublic);
  const mine = useQuery(api.avatars.listMine);

  const columns = Math.max(3, Math.min(6, Math.floor((Math.min(width, 900) - 32) / 120)));
  const size = (Math.min(width, 900) - Spacing.four * 2 - Spacing.three * (columns - 1)) / columns;

  const choose = (id: Id<'avatars'> | null) => {
    update({ avatarId: id });
    router.back();
  };

  const Tile = ({ a }: { a: Avatar }) => {
    const active = a._id === state.avatarId;
    return (
      <Pressable
        testID={`avatar-${a.name}`}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={a.name}
        onPress={() => choose(a._id)}
        style={{ width: size }}>
        <View
          style={[
            styles.tile,
            { width: size, height: (size * 4) / 3, backgroundColor: t.surfaceMuted, borderColor: active ? t.accent : 'transparent' },
          ]}>
          {a.coverUrl ? <Image source={a.coverUrl} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          {active ? (
            <View style={[styles.check, { backgroundColor: t.accent }]}>
              <Icon name="check" size={11} color={t.onAccent} />
            </View>
          ) : null}
        </View>
        <Text variant="callout" numberOfLines={1} style={styles.name}>
          {a.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Text variant="label" tone="secondary">
        Your avatars
      </Text>
      <View style={styles.grid}>
        <Pressable
          testID="new-avatar"
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/avatars/new', params: { select: '1' } })}
          style={{ width: size }}>
          <View
            style={[
              styles.tile,
              styles.newTile,
              { width: size, height: (size * 4) / 3, borderColor: t.accent, backgroundColor: t.accentSoft },
            ]}>
            <Icon name="create" color={t.accent} />
          </View>
          <Text variant="callout" tone="accent" style={styles.name}>
            Create
          </Text>
        </Pressable>
        {(mine ?? []).map((a) => (
          <Tile key={a._id} a={a} />
        ))}
      </View>

      <Text variant="label" tone="secondary" style={styles.heading}>
        AI creators
      </Text>
      <View style={styles.grid}>
        {(catalog ?? []).map((a) => (
          <Tile key={a._id} a={a} />
        ))}
      </View>

      {state.avatarId ? (
        <Pressable accessibilityRole="button" onPress={() => choose(null)} style={styles.none}>
          <Text variant="callout" tone="secondary">
            Don’t use a creator
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.ten },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tile: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 2 },
  newTile: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1.5 },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginTop: Spacing.one },
  heading: { marginTop: Spacing.four },
  none: { alignSelf: 'center', padding: Spacing.four },
});
