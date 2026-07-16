import { describe, expect, it } from 'vitest';
import { splitEmojiText } from '@/lib/emoji/noto-registry';

describe('splitEmojiText', () => {
  it('splits bare heavy black hearts (no U+FE0F) into animated tokens', () => {
    const parts = splitEmojiText('❤❤❤');
    expect(parts).toHaveLength(3);
    expect(parts.every((p) => p.type === 'emoji' && p.notoSlug === 'heart')).toBe(true);
  });

  it('splits hearts with variation selector', () => {
    const parts = splitEmojiText('سلام ❤️ دوست');
    expect(parts).toEqual([
      { type: 'text', value: 'سلام ' },
      { type: 'emoji', value: '❤️', notoSlug: 'heart' },
      { type: 'text', value: ' دوست' },
    ]);
  });

  it('keeps plain text segments unchanged', () => {
    expect(splitEmojiText('فقط متن')).toEqual([{ type: 'text', value: 'فقط متن' }]);
  });
});
