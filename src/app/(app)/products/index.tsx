import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@convex/_generated/api';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ProductsScreen() {
  const t = useTheme();
  const products = useQuery(api.products.listMine);
  const add = () => router.push('/products/new');
  return (
    <>
      <Stack.Screen options={{ headerRight: () => <Button title="Add" kind="ghost" onPress={add} /> }} />
      <ScrollView
        style={{ backgroundColor: t.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        {products?.length === 0 ? (
          <EmptyState
            icon="product"
            title="No products yet"
            message="Save a product once and reuse it in any video."
            action="Add product"
            onAction={add}
          />
        ) : null}
        {(products ?? []).map((p) => (
          <Pressable
            key={p._id}
            accessibilityRole="button"
            onPress={() => router.push(`/products/${p._id}`)}
            style={({ pressed }) => [styles.row, { backgroundColor: t.surface, borderColor: t.border, opacity: pressed ? 0.85 : 1 }]}>
            <View style={[styles.thumb, { backgroundColor: t.surfaceMuted }]}>
              {p.imageUrls[0] ? <Image source={p.imageUrls[0]} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            </View>
            <View style={styles.text}>
              <Text variant="headline" numberOfLines={1}>
                {p.name}
              </Text>
              <Text variant="caption" tone="secondary" numberOfLines={2}>
                {p.description}
              </Text>
            </View>
            <Icon name="chevronRight" size={12} color={t.textTertiary} />
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 56, height: 56, borderRadius: Radius.md, overflow: 'hidden' },
  text: { flex: 1, gap: 2 },
});
