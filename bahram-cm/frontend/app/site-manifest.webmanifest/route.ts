import { NextResponse } from 'next/server';
import { PWA_MANIFEST_ICONS } from '@/lib/pwa/manifest-icons';

export function GET() {
  const manifest = {
    name: 'بهرام رستمی — آکادمی و کمپین‌نویسی',
    short_name: 'بهرام رستمی',
    description: 'مسیر رشد حرفه‌ای، دوره‌ها، مقالات و آکادمی بهرام رستمی',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    dir: 'rtl',
    lang: 'fa',
    background_color: '#0b0f10',
    theme_color: '#0b0f10',
    categories: ['education', 'business'],
    icons: PWA_MANIFEST_ICONS,
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
