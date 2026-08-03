import { scaleToMaxEdge } from '@/lib/media/optimizeSelfieVideo';

/** Enough detail for ID text review without shipping 12MP phone photos. */
export const NATIONAL_CARD_MAX_EDGE = 2048;

/** High quality — card text must stay readable after compression. */
export const NATIONAL_CARD_WEBP_QUALITY = 0.92;

/** Already-small JPEG/WebP uploads skip re-encode to keep the UI snappy. */
export const NATIONAL_CARD_SKIP_OPTIMIZE_BELOW_BYTES = 700 * 1024;

type ImageSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
      mimeType,
      quality,
    );
  });
}

function loadImageWithElement(file: File): Promise<ImageSource> {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      image.removeAttribute('src');
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(objectUrl);
    };

    image.onload = () => {
      resolve({
        source: image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        cleanup,
      });
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('image load failed'));
    };
    image.src = objectUrl;
  });
}

async function loadImageSource(file: File): Promise<ImageSource> {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      /* fall through to <img> */
    }
  }

  return loadImageWithElement(file);
}

/**
 * Always prefer the smaller file — never upload an "optimized" image that grew.
 */
export function pickSmallerImageBlob(original: Blob, candidate: Blob): Blob {
  if (!candidate?.size) return original;
  return candidate.size < original.size ? candidate : original;
}

export function nationalCardOptimizedFileName(original: File): string {
  const base = original.name.replace(/\.[^.]+$/u, '') || 'national-card';
  return `${base}.webp`;
}

/**
 * Shrink a national-card photo before upload (WebP, client-side).
 * Returns the original file when optimization fails or would increase size.
 */
export async function optimizeNationalCardImage(file: File): Promise<File> {
  if (typeof document === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }

  const mime = file.type.toLowerCase();
  if (
    file.size <= NATIONAL_CARD_SKIP_OPTIMIZE_BELOW_BYTES &&
    (mime === 'image/webp' || mime === 'image/jpeg' || mime === 'image/jpg')
  ) {
    return file;
  }

  let cleanup: () => void = () => undefined;

  try {
    const loaded = await loadImageSource(file);
    cleanup = loaded.cleanup;

    const { width, height } = scaleToMaxEdge(loaded.width, loaded.height, NATIONAL_CARD_MAX_EDGE);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return file;

    ctx.drawImage(loaded.source, 0, 0, width, height);

    const webpBlob = await canvasToBlob(canvas, 'image/webp', NATIONAL_CARD_WEBP_QUALITY);
    const best = pickSmallerImageBlob(file, webpBlob);

    if (best === file) {
      return file;
    }

    return new File([best], nationalCardOptimizedFileName(file), {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    cleanup();
  }
}
