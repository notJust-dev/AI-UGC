export type SaveResult = 'saved' | 'denied';

/** Downloads through a blob, since `<a download>` is ignored for cross-origin URLs. */
export async function saveVideoToLibrary(url: string, name: string): Promise<SaveResult> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `${name}.mp4`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  return 'saved';
}

/** Web Share API with the file when supported, else the link, else copy to clipboard. */
export async function shareVideo(url: string, name: string, title: string) {
  try {
    if (typeof navigator.share === 'function') {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `${name}.mp4`, { type: 'video/mp4' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }
      await navigator.share({ url, title });
      return;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
  }
  await navigator.clipboard.writeText(url);
  alert('Link copied to clipboard');
}

export const saveLabel = 'Download';
