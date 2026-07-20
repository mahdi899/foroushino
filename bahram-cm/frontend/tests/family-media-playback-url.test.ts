import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  familyMediaPathname,
  resolveFamilyMediaDownloadUrl,
  resolveFamilyMediaPlaybackUrl,
} from '@/lib/family/mediaPlaybackUrl';

function mockClubOrigin() {
  vi.stubGlobal('window', {
    location: {
      hostname: 'rostami.club',
      origin: 'https://rostami.club',
    },
  });
  vi.stubEnv('NEXT_PUBLIC_FAMILY_DOMAIN', 'rostami.club');
}

describe('familyMediaPathname', () => {
  it('normalizes storage family paths', () => {
    expect(familyMediaPathname('/storage/media/family/2026/07/x.webp')).toBe(
      '/media/family/2026/07/x.webp',
    );
  });
});

describe('resolveFamilyMediaPlaybackUrl on rostami.club', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('rewrites CDN URLs to same-origin family proxy', () => {
    mockClubOrigin();
    expect(
      resolveFamilyMediaPlaybackUrl(
        'https://cdn.rostami.app/media/family/2026/07/video/demo.mp4',
      ),
    ).toBe('https://rostami.club/media/family/2026/07/video/demo.mp4');
  });

  it('rewrites /storage family paths to same-origin', () => {
    mockClubOrigin();
    expect(resolveFamilyMediaPlaybackUrl('/storage/media/family/2026/07/image/a.webp')).toBe(
      'https://rostami.club/media/family/2026/07/image/a.webp',
    );
  });
});

describe('resolveFamilyMediaDownloadUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('always points family media at the download host', () => {
    mockClubOrigin();
    expect(
      resolveFamilyMediaDownloadUrl(
        'https://cdn.rostami.app/media/family/2026/07/image/a.webp',
      ),
    ).toBe('https://cdn.rostami.app/media/family/2026/07/image/a.webp');
  });
});
