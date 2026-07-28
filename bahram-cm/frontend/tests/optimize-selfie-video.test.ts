import { describe, expect, it } from 'vitest';
import { scaleToMaxEdge } from '@/lib/media/optimizeSelfieVideo';

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
