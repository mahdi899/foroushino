import {
  readFamilyMediaBlob,
  tryCacheFamilyMediaBlob,
  writeFamilyMediaBlob,
} from '@/lib/family/mediaCache';

const IMAGE_PREVIEW_MAX_WIDTH = 168;
const IMAGE_PREVIEW_QUALITY = 0.62;

export async function tryBuildImagePreviewBlob(
  mediaId: number,
  url: string,
  source?: Blob,
): Promise<Blob | null> {
  const cached = await readFamilyMediaBlob('preview', mediaId, url);
  if (cached) return cached;

  try {
    let input = source ?? (await readFamilyMediaBlob('full', mediaId, url));
    if (!input) {
      input = await tryCacheFamilyMediaBlob(url, mediaId, 'full');
    }
    if (!input) return null;

    const preview = await buildImagePreviewBlob(input);
    await writeFamilyMediaBlob('preview', mediaId, url, preview);
    return preview;
  } catch {
    return null;
  }
}

export async function buildImagePreviewBlob(
  source: Blob,
  maxWidth = IMAGE_PREVIEW_MAX_WIDTH,
): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, maxWidth / Math.max(bitmap.width, 1));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('canvas unavailable');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('preview encode failed'));
      },
      'image/jpeg',
      IMAGE_PREVIEW_QUALITY,
    );
  });
}
