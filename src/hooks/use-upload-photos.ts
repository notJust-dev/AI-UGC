import { useMutation } from 'convex/react';
import { useCallback } from 'react';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import type { PhotoItem } from '@/components/photo-picker';
import { uploadPhoto } from '@/lib/upload';

/** Uploads any local photos and returns storage ids in the same order. */
export function useUploadPhotos() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  return useCallback(
    async (items: PhotoItem[]): Promise<Id<'_storage'>[]> =>
      Promise.all(
        items.map((item) =>
          item.kind === 'remote'
            ? Promise.resolve(item.storageId as Id<'_storage'>)
            : uploadPhoto(item.photo, () => generateUploadUrl()),
        ),
      ),
    [generateUploadUrl],
  );
}
