import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

async function downloadToCache(url: string, name: string): Promise<File> {
  const dir = new Directory(Paths.cache, 'videos');
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, `${name}.mp4`);
  if (target.exists) return target;
  return File.downloadFileAsync(url, target);
}

export type SaveResult = 'saved' | 'denied';

/** Saves the mp4 to the camera roll (add-only permission). */
export async function saveVideoToLibrary(url: string, name: string): Promise<SaveResult> {
  const permission = await MediaLibrary.requestPermissionsAsync(true, ['video']);
  if (!permission.granted) return 'denied';
  const file = await downloadToCache(url, name);
  await MediaLibrary.Asset.create(file.uri);
  return 'saved';
}

/** Opens the system share sheet with the video file. */
export async function shareVideo(url: string, name: string, title: string) {
  const file = await downloadToCache(url, name);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'video/mp4',
    UTI: 'public.mpeg-4',
    dialogTitle: title,
  });
}

export const saveLabel = 'Save to Photos';
