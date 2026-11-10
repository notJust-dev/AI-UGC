import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { Id } from '@convex/_generated/dataModel';

const MAX_SIDE = 2048;

export type PickedPhoto = { uri: string; width: number; height: number };

/** Opens the photo library; returns up to `limit` photos. */
export async function pickPhotos(limit: number): Promise<PickedPhoto[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 1,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
}

/** Re-encodes to JPEG ≤ 2048 px (removes HEIC, keeps uploads small). */
async function normalize(photo: PickedPhoto): Promise<string> {
  const context = ImageManipulator.manipulate(photo.uri);
  const longest = Math.max(photo.width, photo.height);
  if (longest > MAX_SIDE) {
    context.resize(photo.width >= photo.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  return saved.uri;
}

/** Uploads one photo to Convex storage and returns its storage id. */
export async function uploadPhoto(
  photo: PickedPhoto,
  getUploadUrl: () => Promise<string>,
): Promise<Id<'_storage'>> {
  const uri = await normalize(photo);
  const uploadUrl = await getUploadUrl();
  const body = Platform.OS === 'web' ? await (await fetch(uri)).blob() : new File(uri);
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body,
  });
  if (!res.ok) throw new Error(`upload failed ${res.status}`);
  const { storageId } = (await res.json()) as { storageId: Id<'_storage'> };
  return storageId;
}
