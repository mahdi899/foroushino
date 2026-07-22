import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDomains() {
  vi.resetModules();
  return import('@/lib/domains');
}

describe('domains', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('ignores loopback NEXT_PUBLIC_SITE_URL when APP_DOMAIN is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_APP_DOMAIN', 'rostami.app');
    const { appPublicOrigin } = await loadDomains();
    expect(appPublicOrigin()).toBe('https://rostami.app');
  });

  it('uses explicit production NEXT_PUBLIC_SITE_URL when not loopback', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://rostami.app');
    vi.stubEnv('NEXT_PUBLIC_APP_DOMAIN', 'rostami.app');
    const { appPublicOrigin } = await loadDomains();
    expect(appPublicOrigin()).toBe('https://rostami.app');
  });

  it('ignores loopback family site URL when FAMILY_DOMAIN is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_FAMILY_SITE_URL', 'http://localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_FAMILY_DOMAIN', 'rostami.club');
    const { familyPublicOrigin } = await loadDomains();
    expect(familyPublicOrigin()).toBe('https://rostami.club');
  });

  it('familyHomeHref stays on /family when hostname is the main app', async () => {
    vi.stubEnv('NEXT_PUBLIC_FAMILY_DOMAIN', 'rostami.club');
    const { familyHomeHref } = await loadDomains();
    expect(familyHomeHref('rostami.app')).toBe('/family');
  });

  it('familyHomeHref uses club apex on the family host', async () => {
    vi.stubEnv('NEXT_PUBLIC_FAMILY_DOMAIN', 'rostami.club');
    const { familyHomeHref } = await loadDomains();
    expect(familyHomeHref('rostami.club')).toBe('https://rostami.club/');
  });

  it('detects loopback origins', async () => {
    const { isLoopbackOrigin } = await loadDomains();
    expect(isLoopbackOrigin('http://localhost:3000')).toBe(true);
    expect(isLoopbackOrigin('https://rostami.app')).toBe(false);
  });
});
