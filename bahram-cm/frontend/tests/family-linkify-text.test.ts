import { describe, expect, it } from 'vitest';
import { splitTextWithLinks } from '@/lib/family/linkifyText';

describe('splitTextWithLinks', () => {
  it('leaves plain text unchanged', () => {
    expect(splitTextWithLinks('سلام دنیا')).toEqual([{ type: 'text', value: 'سلام دنیا' }]);
  });

  it('detects https URLs in mixed text', () => {
    expect(
      splitTextWithLinks(
        'لینک: https://rostami.app/panel/profile (اگر کار نکرد کپی کنید)',
      ),
    ).toEqual([
      { type: 'text', value: 'لینک: ' },
      { type: 'link', value: 'https://rostami.app/panel/profile', href: 'https://rostami.app/panel/profile' },
      { type: 'text', value: ' (اگر کار نکرد کپی کنید)' },
    ]);
  });

  it('strips trailing punctuation from URLs', () => {
    expect(splitTextWithLinks('ببین https://example.com).')).toEqual([
      { type: 'text', value: 'ببین ' },
      { type: 'link', value: 'https://example.com', href: 'https://example.com' },
      { type: 'text', value: ').' },
    ]);
  });
});
