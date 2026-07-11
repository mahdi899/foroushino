import type { Area } from 'react-easy-crop';

const DEFAULT_OUTPUT_SIZE = 512;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('بارگذاری تصویر ناموفق بود.')));
    image.crossOrigin = 'anonymous';
    image.src = src;
  });
}

export async function cropImageToBlob(
  imageSrc: string,
  crop: Area,
  outputSize = DEFAULT_OUTPUT_SIZE,
  mimeType: 'image/jpeg' | 'image/webp' = 'image/jpeg',
  quality = 0.92,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('مرورگر از ویرایش تصویر پشتیبانی نمی‌کند.');

  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('برش تصویر ناموفق بود.'))),
      mimeType,
      quality,
    );
  });
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}
