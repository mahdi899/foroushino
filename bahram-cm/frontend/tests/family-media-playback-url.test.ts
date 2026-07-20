import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  familyMediaPathname,
  resolveFamilyMediaDownloadUrl,
  resolveFamilyMediaPlaybackUrl,
} from '@/lib/family/mediaPlaybackUrl';

describe('familyMediaPathname', () => {
  it('normalizes storage family paths', () => {
    expect(familyMediaPathname('/storage/media/family/2026/07/x.webp')).toBe(
      '/media/family/2026/07/x.webp',
    );
  });
});

describe('resolveFamilyMediaPlaybackUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rewrites rostami.club proxy URLs to cdn.rostami.app', () => {
    expect(
      resolveFamilyMediaPlaybackUrl(
        'https://rostami.club/media/family/2026/07/video/demo.mp4',
      ),
    ).toBe('https://cdn.rostami.app/media/family/2026/07/video/demo.mp4');
  });

  it('rewrites /storage family paths to cdn', () => {
    expect(resolveFamilyMediaPlaybackUrl('/storage/media/family/2026/07/image/a.webp')).toBe(
      'https://cdn.rostami.app/media/family/2026/07/image/a.webp',
    );
  });

  it('keeps cdn.rostami.app URLs on the download host', () => {
    expect(
      resolveFamilyMediaPlaybackUrl(
        'https://cdn.rostami.app/media/family/2026/07/image/a.webp',
      ),
    ).toBe('https://cdn.rostami.app/media/family/2026/07/image/a.webp');
  });
});

describe('resolveFamilyMediaDownloadUrl', () => {
  it('points story images at the download host', () => {
    expect(
      resolveFamilyMediaDownloadUrl(
        'https://rostami.club/media/family/2026/07/image/a.webp',
      ),
    ).toBe('https://cdn.rostami.app/media/family/2026/07/image/a.webp');
  });
});
