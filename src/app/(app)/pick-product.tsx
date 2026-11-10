import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useComposer } from '@/hooks/use-composer';
import { useTheme } from '@/hooks/use-theme';

export default function PickProductSheet() {
  const t = useTheme();
  const { state, update } = useComposer();
  const products = useQuery(api.products.listMine);

  const choose = (id: Id<'products'> | null) => {
    update({ productId: id });
    router.back();
  };
  const addNew = () => router.push({ pathname: '/products/new', params: { select: '1' } });

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      {products && products.length === 0 ? (
        <EmptyState
          icon="product"
          title="Save your first product"
          message="Add a name, a short description and 1–4 photos. Reuse it in any video."
          action="Add product"
          onAction={addNew}
        />
      ) : (
        <>
          {(products ?? []).map((p) => {
            const active = p._id === state.productId;
            return (
              <Pressable
                key={p._id}
                testID={`product-${p.name}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => choose(p._id)}
                style={[
                  styles.row,
                  { backgroundColor: t.surface, borderColor: active ? t.accent : t.border },
                ]}>
                <View style={[styles.thumb, { backgroundColor: t.surfaceMuted }]}>
                  {p.imageUrls[0] ? (
                    <Image source={p.imageUrls[0]} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : null}
                </View>
                <View style={styles.text}>
                  <Text variant="headline" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text variant="caption" tone="secondary" numberOfLines={2}>
                    {p.description || `${p.imageUrls.length} photo(s)`}
                  </Text>
                </View>
                {active ? <Icon name="checkCircle" size={18} color={t.accent} /> : null}
              </Pressable>
            );
          })}
          <Button title="Add product" icon="create" kind="secondary" onPress={addNew} testID="new-product" />
          {state.productId ? (
            <Pressable accessibilityRole="button" onPress={() => choose(null)} style={styles.none}>
              <Text variant="callout" tone="secondary">
                Don’t use a product
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.ten },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  thumb: { width: 56, height: 56, borderRadius: Radius.md, overflow: 'hidden' },
  text: { flex: 1, gap: 2 },
  none: { alignSelf: 'center', padding: Spacing.four },
});
