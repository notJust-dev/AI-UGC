import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickPhotos, type PickedPhoto } from '@/lib/upload';

import { Icon } from './ui/icon';
import { Text } from './ui/text';

/** A photo already uploaded (existing record) or freshly picked (local). */
export type PhotoItem =
  | { kind: 'remote'; url: string; storageId: string }
  | { kind: 'local'; photo: PickedPhoto };

export function PhotoPicker({
  items,
  onChange,
  max = 4,
  tileSize = 96,
}: {
  items: PhotoItem[];
  onChange: (items: PhotoItem[]) => void;
  max?: number;
  tileSize?: number;
}) {
  const t = useTheme();
  const add = async () => {
    const picked = await pickPhotos(max - items.length);
    if (picked.length) onChange([...items, ...picked.map((photo) => ({ kind: 'local' as const, photo }))]);
  };

  return (
    <View style={styles.grid}>
      {items.map((item, i) => (
        <View key={i} style={[styles.tile, { width: tileSize, height: tileSize, backgroundColor: t.surfaceMuted }]}>
          <Image
            source={item.kind === 'remote' ? item.url : item.photo.uri}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${i + 1}`}
            hitSlop={8}
            onPress={() => onChange(items.filter((_, j) => j !== i))}
            style={styles.remove}>
            <Icon name="close" size={11} color="#fff" />
          </Pressable>
        </View>
      ))}
      {items.length < max ? (
        <Pressable
          testID="add-photo"
          accessibilityRole="button"
          accessibilityLabel="Add photos"
          onPress={add}
          style={({ pressed }) => [
            styles.tile,
            styles.add,
            { width: tileSize, height: tileSize, borderColor: t.accent, backgroundColor: t.accentSoft, opacity: pressed ? 0.8 : 1 },
          ]}>
          <Icon name="create" color={t.accent} size={20} />
          <Text variant="caption" tone="accent">
            {items.length}/{max}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tile: { borderRadius: Radius.md, overflow: 'hidden' },
  add: { alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1.5, borderStyle: 'dashed' },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
