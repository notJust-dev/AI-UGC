import { useMutation } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';

import { api } from '@convex/_generated/api';
import { ProductForm } from '@/components/product-form';
import { useComposer } from '@/hooks/use-composer';

export default function NewProductScreen() {
  const { select } = useLocalSearchParams<{ select?: string }>();
  const { update } = useComposer();
  const create = useMutation(api.products.create);
  return (
    <ProductForm
      submitLabel="Save product"
      onSubmit={async (v) => {
        const id = await create(v);
        if (select) {
          update({ productId: id });
          router.dismiss(2);
        } else {
          router.back();
        }
      }}
    />
  );
}
