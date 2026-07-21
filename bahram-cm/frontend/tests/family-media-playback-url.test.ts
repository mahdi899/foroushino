import { afterEach, describe, expect, it, vi } from 'vitest';
import { familyMediaCacheFetchUrl } from '@/lib/family/mediaCache';
import {
  familyMediaPathname,
  inferFamilyMediaMimeType,
  normalizeFamilyGalleryMediaPath,
  resolveFamilyMediaDownloadUrl,
  resolveFamilyMediaPlaybackCandidates,
  resolveFamilyMediaPlaybackUrl,
} from '@/lib/family/mediaPlaybackUrl';

describe('normalizeFamilyGalleryMediaPath', () => {
  it('fixes legacy site/family nesting', () => {
    expect(normalizeFamilyGalleryMediaPath('/media/site/family/demo/a.jpg')).toBe(
      '/media/family/demo/a.jpg',
    );
    expect(normalizeFamilyGalleryMediaPath('/storage/media/site/family/demo/a.jpg')).toBe(
      '/media/family/demo/a.jpg',
    );
  });
});

describe('familyMediaPathname', () => {
  it('normalizes storage family paths', () => {
    expect(familyMediaPathname('/storage/media/family/2026/07/x.webp')).toBe(
      '/media/family/2026/07/x.webp',
    );
  });

  it('fixes legacy storage site/family paths', () => {
    expect(familyMediaPathname('/storage/media/site/family/demo/a.jpg')).toBe(
      '/media/family/demo/a.jpg',
    );
  });

  it('normalizes /media/site/family to /media/family', () => {
    expect(familyMediaPathname('/media/site/family/demo/a.jpg')).toBe(
      '/media/family/demo/a.jpg',
    );
  });
});

describe('resolveFamilyMediaPlaybackUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rewrites legacy storage site/family paths to cdn family path', () => {
    expect(
      resolveFamilyMediaPlaybackUrl('/storage/media/site/family/demo/demo-image-1.jpg'),
    ).toBe('https://cdn.rostami.app/media/family/demo/demo-image-1.jpg');
  });

  it('rewrites rostami.club proxy URLs to cdn.rostami.app', () => {
    expect(
      resolveFamilyMediaPlaybackUrl(
        'https://rostami.club/media/family/2026/07/video/demo.mp4',
      ),
    ).toBe('https://cdn.rostami.app/media/family/2026/07/video/demo.mp4');
  });

  it('preserves cache-buster query on rewrite', () => {
    expect(
      resolveFamilyMediaPlaybackUrl(
        'https://rostami.club/media/family/2026/07/voice/demo.m4a?v=123',
      ),
    ).toBe('https://cdn.rostami.app/media/family/2026/07/voice/demo.m4a?v=123');
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

describe('inferFamilyMediaMimeType', () => {
  it('prefers API mime type', () => {
    expect(inferFamilyMediaMimeType('https://cdn/a.bin', 'video/mp4')).toBe('video/mp4');
  });

  it('infers from extension', () => {
    expect(inferFamilyMediaMimeType('https://cdn/a.mp4', null)).toBe('video/mp4');
  });
});

describe('resolveFamilyMediaPlaybackCandidates', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('includes CDN URL when no proxy origin is configured', () => {
    expect(
      resolveFamilyMediaPlaybackCandidates('/media/family/demo/demo-video.mp4'),
    ).toEqual(['https://cdn.rostami.app/media/family/demo/demo-video.mp4']);
  });

  it('prefers CDN then same-origin club URL when family site URL is set', () => {
    vi.stubEnv('NEXT_PUBLIC_FAMILY_SITE_URL', 'https://rostami.club');
    expect(
      resolveFamilyMediaPlaybackCandidates('/media/family/demo/demo-video.mp4', 42),
    ).toEqual([
      'https://cdn.rostami.app/media/family/demo/demo-video.mp4',
      'https://rostami.club/media/family/demo/demo-video.mp4',
    ]);
  });

  it('prefers CDN then same-origin club URL in the browser on rostami.club', () => {
    vi.stubGlobal('window', { location: { origin: 'https://rostami.club', hostname: 'rostami.club' } });
    expect(
      resolveFamilyMediaPlaybackCandidates('/media/family/demo/demo-video.mp4', 42),
    ).toEqual([
      'https://cdn.rostami.app/media/family/demo/demo-video.mp4',
      'https://rostami.club/media/family/demo/demo-video.mp4',
    ]);
  });

  it('does not use API stream proxy', () => {
    vi.stubGlobal('window', { location: { origin: 'https://rostami.club', hostname: 'rostami.club' } });
    const candidates = resolveFamilyMediaPlaybackCandidates('/media/family/demo/demo-video.mp4', 42);
    expect(candidates.some((u) => u.includes('/api/family/media/'))).toBe(false);
  });
});

describe('familyMediaCacheFetchUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('never returns same-origin /storage paths for legacy refs', () => {
    vi.stubEnv('NEXT_PUBLIC_FAMILY_DOMAIN', 'club.lvh.me');
    const fetchUrl = familyMediaCacheFetchUrl(
      'http://club.lvh.me:3001/storage/media/site/family/demo/demo-image-1.jpg',
    );
    expect(fetchUrl).not.toContain('/storage/media/');
    expect(fetchUrl).toBe('https://cdn.rostami.app/media/family/demo/demo-image-1.jpg');
  });
});
