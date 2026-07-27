import { describe, expect, it } from 'vitest';
import { extractFamilyPostMediaUrls } from '@/lib/family/feedMediaWarmup';
import type { FamilyPost } from '@/lib/family/types';

describe('extractFamilyPostMediaUrls', () => {
  it('collects image and video poster URLs from blocks', () => {
    const post = {
      id: 1,
      blocks: [
        {
          id: 1,
          type: 'image',
          position: 0,
          text: null,
          data: null,
          article: null,
          media: {
            id: 10,
            type: 'image',
            url: '/media/family/a.webp',
            poster_url: null,
            duration: null,
            width: 800,
            height: 600,
            waveform: null,
            mime_type: 'image/webp',
            status: 'ready',
          },
        },
        {
          id: 2,
          type: 'video',
          position: 1,
          text: null,
          data: null,
          article: null,
          media: {
            id: 11,
            type: 'video',
            url: 'https://cdn.example/media/family/b.mp4',
            poster_url: '/media/family/b_preview.webp',
            duration: 12,
            width: 720,
            height: 1280,
            waveform: null,
            mime_type: 'video/mp4',
            status: 'ready',
          },
        },
      ],
    } as FamilyPost;

    const urls = extractFamilyPostMediaUrls(post);
    expect(urls.some((u) => u.includes('a.webp'))).toBe(true);
    expect(urls.some((u) => u.includes('b_preview.webp'))).toBe(true);
    expect(urls.some((u) => u.includes('b.mp4'))).toBe(false);
  });
});
