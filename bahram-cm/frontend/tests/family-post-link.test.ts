import { describe, expect, it } from 'vitest';
import { familyPostPath, familyPostUrl, parseFamilyPostId } from '@/lib/family/postLink';

describe('parseFamilyPostId', () => {
  it('parses positive integers', () => {
    expect(parseFamilyPostId('79')).toBe(79);
    expect(parseFamilyPostId(' 42 ')).toBe(42);
  });

  it('rejects invalid values', () => {
    expect(parseFamilyPostId(null)).toBeNull();
    expect(parseFamilyPostId('')).toBeNull();
    expect(parseFamilyPostId('0')).toBeNull();
    expect(parseFamilyPostId('-3')).toBeNull();
    expect(parseFamilyPostId('abc')).toBeNull();
  });
});

describe('familyPostPath', () => {
  it('builds club home deep link', () => {
    expect(familyPostPath(79)).toBe('/?post=79');
  });
});

describe('familyPostUrl', () => {
  it('uses configured public origin when set', () => {
    const prev = process.env.NEXT_PUBLIC_FAMILY_SITE_URL;
    process.env.NEXT_PUBLIC_FAMILY_SITE_URL = 'https://rostami.club';
    expect(familyPostUrl(12)).toBe('https://rostami.club/?post=12');
    process.env.NEXT_PUBLIC_FAMILY_SITE_URL = prev;
  });
});
