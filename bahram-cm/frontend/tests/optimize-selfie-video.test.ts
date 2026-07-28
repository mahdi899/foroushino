import { describe, expect, it } from 'vitest';
import { pickSmallerVideoBlob, scaleToMaxEdge } from '@/lib/media/optimizeSelfieVideo';

describe('scaleToMaxEdge', () => {
  it('keeps dimensions when already within max edge', () => {
    expect(scaleToMaxEdge(640, 480, 720)).toEqual({ width: 640, height: 480 });
  });

  it('scales landscape down to max edge', () => {
    expect(scaleToMaxEdge(1920, 1080, 720)).toEqual({ width: 720, height: 404 });
  });

  it('scales portrait down to max edge', () => {
    expect(scaleToMaxEdge(1080, 1920, 720)).toEqual({ width: 404, height: 720 });
  });
});

describe('pickSmallerVideoBlob', () => {
  it('keeps the original when optimized is larger', () => {
    const original = new Blob(['aaaa'], { type: 'video/webm' });
    const optimized = new Blob(['aaaaaaaa'], { type: 'video/webm' });
    expect(pickSmallerVideoBlob(original, optimized)).toBe(original);
  });

  it('uses optimized when it is smaller', () => {
    const original = new Blob(['aaaaaaaa'], { type: 'video/webm' });
    const optimized = new Blob(['aa'], { type: 'video/webm' });
    expect(pickSmallerVideoBlob(original, optimized)).toBe(optimized);
  });

  it('keeps the original when sizes are equal', () => {
    const original = new Blob(['aaaa'], { type: 'video/webm' });
    const optimized = new Blob(['bbbb'], { type: 'video/webm' });
    expect(pickSmallerVideoBlob(original, optimized)).toBe(original);
  });
});
