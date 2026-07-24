import { NextRequest, NextResponse } from 'next/server';
import { PWA_MANIFEST_ICONS } from '@/lib/pwa/manifest-icons';

const FAMILY_DOMAIN = process.env.NEXT_PUBLIC_FAMILY_DOMAIN?.trim().toLowerCase() || '';

/**
 * Dynamic PWA manifest for the Family app. Option B dual-domain: on
 * rostami.club (apex) the family app is the whole site, so `start_url`/`scope`
 * must be `/`. On the legacy path-based host (rostami.app/family, local dev)
 * they stay `/family` so the browser doesn't treat the rest of the site as
 * in-scope for this PWA's install.
 */
export function GET(request: NextRequest) {
  const hostname = (request.headers.get('host')?.split(':')[0] ?? '').toLowerCase();
  const isClubApex = Boolean(FAMILY_DOMAIN) && hostname === FAMILY_DOMAIN;

  const startUrl = isClubApex ? '/' : '/family';
  const scope = isClubApex ? '/' : '/family';

  const manifest = {
    name: 'خانواده',
    short_name: 'خانواده',
    description: 'فضای نزدیک داداش بهرام — پست، صوت، ویدیو و گفتگو',
    start_url: startUrl,
    scope,
    display: 'standalone',
    orientation: 'portrait-primary',
    dir: 'rtl',
    lang: 'fa',
    background_color: '#0b1419',
    theme_color: '#0b1419',
    categories: ['social', 'education'],
    icons: [...PWA_MANIFEST_ICONS],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
