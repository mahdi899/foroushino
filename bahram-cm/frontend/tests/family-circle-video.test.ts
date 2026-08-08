import { describe, expect, it } from 'vitest';
import { isFamilyCircleVideo } from '@/lib/family/types';

describe('isFamilyCircleVideo', () => {
  it('detects presentation circle flag', () => {
    expect(isFamilyCircleVideo({ presentation: 'circle' })).toBe(true);
    expect(isFamilyCircleVideo({ video_note: true })).toBe(true);
    expect(isFamilyCircleVideo({ presentation: 'rect' })).toBe(false);
    expect(isFamilyCircleVideo(null)).toBe(false);
    expect(isFamilyCircleVideo(undefined)).toBe(false);
  });
});
