import { describe, expect, it } from 'vitest';
import { estimateFeedItemSize } from '@/lib/family/feedItemEstimate';
import type { FamilyPost } from '@/lib/family/types';

const basePost = (overrides: Partial<FamilyPost> = {}): FamilyPost =>
  ({
    id: 1,
    type: 'mixed',
    published_at: '2026-07-16T10:00:00Z',
    author: { id: 1, name: 'B' },
    blocks: [],
    actions: [],
    stats: {
      fire: 0,
      heart: 0,
      target: 0,
      clap: 0,
      thumbs_up: 0,
      laugh: 0,
      sad: 0,
      party: 0,
      star: 0,
      rocket: 0,
      eyes: 0,
      pray: 0,
      muscle: 0,
      hundred: 0,
      wink: 0,
      comments: 0,
      views: 0,
    },
    is_pinned: false,
    is_important: false,
    ...overrides,
  }) as FamilyPost;

describe('estimateFeedItemSize', () => {
  it('estimates poll posts much taller than the old flat action guess', () => {
    const post = basePost({
      actions: [
        {
          id: 9,
          type: 'single_choice',
          prompt: 'نظرسنجی: بزرگ‌ترین چالش این هفته‌ات چی بود؟',
          config: null,
          options: [
            { id: 1, label: 'تمرکز و حواس‌پرتی', value: 'a', position: 0 },
            { id: 2, label: 'مدیریت زمان', value: 'b', position: 1 },
            { id: 3, label: 'انگیزه و ثبات', value: 'c', position: 2 },
            { id: 4, label: 'فروش و مذاکره', value: 'd', position: 3 },
          ],
          results: { total: 2, options: [] },
          responded: false,
        },
      ],
    });

    const estimate = estimateFeedItemSize(0, { kind: 'post', key: 'post-1', post });
    expect(estimate).toBeGreaterThan(280);
  });

  it('does not cap tall mixed posts at 720px', () => {
    const post = basePost({
      blocks: [{ id: 1, type: 'text', position: 0, text: 'x'.repeat(400), data: null, media: null, article: null }],
      actions: [
        {
          id: 2,
          type: 'single_choice',
          prompt: 'سوال',
          config: null,
          options: Array.from({ length: 6 }, (_, i) => ({
            id: i + 1,
            label: `گزینه ${i + 1}`,
            value: String(i),
            position: i,
          })),
          results: null,
        },
      ],
    });

    const estimate = estimateFeedItemSize(0, { kind: 'post', key: 'post-2', post });
    expect(estimate).toBeGreaterThan(400);
  });

  it('caps tall portrait images to CSS media max-height (~416px)', () => {
    const post = basePost({
      blocks: [
        {
          id: 1,
          type: 'image',
          position: 0,
          text: null,
          data: null,
          media: {
            id: 1,
            type: 'image',
            url: '/a.webp',
            duration: null,
            width: 1080,
            height: 2400,
            waveform: null,
            mime_type: 'image/webp',
            status: 'ready',
          },
          article: null,
        },
      ],
    });

    const estimate = estimateFeedItemSize(0, { kind: 'post', key: 'post-img', post });
    // chrome (~76) + capped image (416) — must not use uncapped aspect (~755)
    expect(estimate).toBeLessThanOrEqual(520);
    expect(estimate).toBeGreaterThan(400);
  });

  it('treats consecutive images as one album row instead of summing heights', () => {
    const post = basePost({
      blocks: Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        type: 'image' as const,
        position: i,
        text: null,
        data: null,
        media: {
          id: i + 1,
          type: 'image' as const,
          url: `/a${i}.webp`,
          duration: null,
          width: 800,
          height: 800,
          waveform: null,
          mime_type: 'image/webp',
          status: 'ready',
        },
        article: null,
      })),
    });

    const estimate = estimateFeedItemSize(0, { kind: 'post', key: 'post-album', post });
    // album ~384 + chrome — not 6×340
    expect(estimate).toBeLessThan(520);
    expect(estimate).toBeGreaterThan(300);
  });
});
