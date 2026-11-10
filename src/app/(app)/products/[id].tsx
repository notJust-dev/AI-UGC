import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Platform, View } from 'react-native';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { EmptyState } from '@/components/empty-state';
import { ProductForm } from '@/components/product-form';
import { Spacing } from '@/constants/theme';
import { useComposer } from '@/hooks/use-composer';
import { useTheme } from '@/hooks/use-theme';

export default function EditProductScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: Id<'products'> }>();
  const product = useQuery(api.products.get, { id });
  const save = useMutation(api.products.update);
  const remove = useMutation(api.products.remove);
  const { state, update } = useComposer();

  if (product === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.background }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (product === null) {
    return (
      <View style={{ flex: 1, padding: Spacing.six, backgroundColor: t.background }}>
        <EmptyState icon="warning" title="Product not found" />
      </View>
    );
  }

  const confirmDelete = () => {
    const go = async () => {
      await remove({ id });
      if (state.productId === id) update({ productId: null });
      router.back();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${product.name}?`)) go();
      return;
    }
    Alert.alert(`Delete ${product.name}?`, 'Videos you already made are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <ProductForm
      submitLabel="Save changes"
      initial={{
        name: product.name,
        description: product.description,
        photos: product.imageIds.map((storageId, i) => ({
          kind: 'remote' as const,
          storageId,
          url: product.imageUrls[i] ?? '',
        })),
      }}
      onSubmit={async (v) => {
        await save({ id, ...v });
        router.back();
      }}
      onDelete={confirmDelete}
    />
  );
}
