import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import '@/styles/family.css';
import { fontVariable } from '@/lib/fonts';
import { cn } from '@/lib/cn';
import { sitePhotos } from '@/lib/site-photo-paths';
import { primarySiteImageSrc } from '@/lib/mediaUrl';
import { FamilyMediaPlayerProvider } from '@/lib/family/FamilyMediaPlayerContext';
import { FamilyActionCelebrateProvider } from '@/lib/family/FamilyActionCelebrateContext';
import { FamilyThemeBoot } from '@/app/family/FamilyThemeBoot';
import { FamilyPerfTierBoot } from '@/app/family/FamilyPerfTierBoot';
import { FamilyMediaPreconnect } from '@/components/family/FamilyMediaPreconnect';
import { FamilyServiceWorkerRegistrar } from '@/components/family/FamilyServiceWorkerRegistrar';
import { FamilyReactScan } from '@/components/family/FamilyReactScan';
import { FamilyKeyboardViewportBoot } from '@/components/family/FamilyKeyboardViewportBoot';
import { FamilyPwaInstallBoot } from '@/components/family/FamilyPwaInstallBoot';
import { BahramUpdateBanner } from '@/components/pwa/BahramUpdateBanner';
import {
  DEFAULT_SITE_THEME,
  SITE_THEME_COOKIE_KEY,
  parseSiteTheme,
} from '@/lib/site-theme';

export const metadata: Metadata = {
  title: 'خانواده',
  description: 'فضای نزدیک داداش بهرام با اعضای خانواده — پست، صوت، ویدیو و گفتگو.',
  robots: { index: false, follow: false },
  manifest: '/family-manifest.webmanifest',
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
  appleWebApp: {
    capable: true,
    title: 'خانواده',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#d9e4ec' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1419' },
  ],
};

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const initialTheme =
    parseSiteTheme((await cookies()).get(SITE_THEME_COOKIE_KEY)?.value) ?? DEFAULT_SITE_THEME;

  const wallpaperSrc =
    primarySiteImageSrc(sitePhotos.familyChatWallpaper) || sitePhotos.familyChatWallpaper;
  const familyRootStyle = {
    '--family-chat-wallpaper-photo': `url('${wallpaperSrc}')`,
  } as CSSProperties;

  return (
    <div
      id="family-root"
      dir="rtl"
      data-family-theme={initialTheme}
      className={cn(
        'family-app family-app__canvas h-[100dvh] overflow-hidden antialiased',
        fontVariable,
      )}
      style={familyRootStyle}
      suppressHydrationWarning
    >
      <FamilyMediaPreconnect />
      <FamilyThemeBoot />
      <FamilyPerfTierBoot />
      <FamilyKeyboardViewportBoot />
      <FamilyServiceWorkerRegistrar />
      <FamilyReactScan />
      <FamilyMediaPlayerProvider>
        <FamilyActionCelebrateProvider>
          <div className="family-app__frame relative mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden">
            {children}
            <FamilyPwaInstallBoot />
            <BahramUpdateBanner variant="family" />
          </div>
        </FamilyActionCelebrateProvider>
      </FamilyMediaPlayerProvider>
    </div>
  );
}
