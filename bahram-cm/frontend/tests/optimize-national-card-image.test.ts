import { describe, expect, it } from 'vitest';
import {
  nationalCardOptimizedFileName,
  pickSmallerImageBlob,
} from '@/lib/media/optimizeNationalCardImage';

describe('pickSmallerImageBlob', () => {
  it('keeps the original when optimized is larger', () => {
    const original = new Blob(['aaaa'], { type: 'image/jpeg' });
    const optimized = new Blob(['aaaaaaaa'], { type: 'image/webp' });
    expect(pickSmallerImageBlob(original, optimized)).toBe(original);
  });

  it('uses optimized when it is smaller', () => {
    const original = new Blob(['aaaaaaaa'], { type: 'image/jpeg' });
    const optimized = new Blob(['aa'], { type: 'image/webp' });
    expect(pickSmallerImageBlob(original, optimized)).toBe(optimized);
  });

  it('keeps the original when sizes are equal', () => {
    const original = new Blob(['aaaa'], { type: 'image/jpeg' });
    const optimized = new Blob(['bbbb'], { type: 'image/webp' });
    expect(pickSmallerImageBlob(original, optimized)).toBe(original);
  });
});

describe('nationalCardOptimizedFileName', () => {
  it('replaces extension with webp', () => {
    const file = new File(['x'], 'IMG_1234.JPG', { type: 'image/jpeg' });
    expect(nationalCardOptimizedFileName(file)).toBe('IMG_1234.webp');
  });

  it('falls back to national-card when name has no extension', () => {
    const file = new File(['x'], 'scan', { type: 'image/png' });
    expect(nationalCardOptimizedFileName(file)).toBe('scan.webp');
  });
});
