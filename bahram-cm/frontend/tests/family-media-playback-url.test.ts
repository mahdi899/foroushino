import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  familyMediaPathname,
  inferFamilyMediaMimeType,
  resolveFamilyMediaDownloadUrl,
  resolveFamilyMediaPlaybackCandidates,
  resolveFamilyMediaStreamCandidates,
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
  it('includes CDN URL', () => {
    expect(
      resolveFamilyMediaPlaybackCandidates('/media/family/demo/demo-video.mp4'),
    ).toEqual(['https://cdn.rostami.app/media/family/demo/demo-video.mp4']);
  });

  it('prefers same-origin stream proxy when mediaId is provided', () => {
    vi.stubGlobal('window', { location: { origin: 'https://rostami.club', hostname: 'rostami.club' } });
    expect(
      resolveFamilyMediaPlaybackCandidates('/media/family/demo/demo-video.mp4', 42),
    ).toEqual([
      'https://rostami.club/api/family/media/42/stream',
      'https://rostami.club/media/family/demo/demo-video.mp4',
    ]);
  });

  it('stream candidates omit CDN when mediaId is provided', () => {
    vi.stubGlobal('window', { location: { origin: 'https://rostami.club', hostname: 'rostami.club' } });
    expect(
      resolveFamilyMediaStreamCandidates('/media/family/demo/demo-video.mp4', 42),
    ).toEqual([
      'https://rostami.club/api/family/media/42/stream',
      'https://rostami.club/media/family/demo/demo-video.mp4',
    ]);
  });
});
