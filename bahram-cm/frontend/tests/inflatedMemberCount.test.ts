import { describe, expect, it } from 'vitest';
import { inflatedMemberCount } from '@/lib/family/inflatedMemberCount';

describe('inflatedMemberCount', () => {
  it('multiplies by ten and uses hour ones digit', () => {
    expect(inflatedMemberCount(6, 4)).toBe(64);
    expect(inflatedMemberCount(6, 14)).toBe(64);
    expect(inflatedMemberCount(6, 16)).toBe(66);
  });

  it('floors fractional counts', () => {
    expect(inflatedMemberCount(5.9, 3)).toBe(53);
  });
});
