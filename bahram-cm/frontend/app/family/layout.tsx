import type { Metadata, Viewport } from 'next';
import '@/styles/family.css';
import { fontClassName, fontVariable } from '@/lib/fonts';
import { cn } from '@/lib/cn';
import { FamilyMediaPlayerProvider } from '@/lib/family/FamilyMediaPlayerContext';
import { FamilyActionCelebrateProvider } from '@/lib/family/FamilyActionCelebrateContext';
import { FamilyThemeBoot } from '@/app/family/FamilyThemeBoot';
import { DEFAULT_SITE_THEME } from '@/lib/site-theme';

export const metadata: Metadata = {
  title: 'خانواده داداش بهرام',
  description: 'فضای نزدیک داداش بهرام با اعضای خانواده — پست، صوت، ویدیو و گفتگو.',
  robots: { index: false, follow: false },
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#d9e4ec' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1621' },
  ],
};

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="family-root"
      dir="rtl"
      data-family-theme={DEFAULT_SITE_THEME}
      className={cn(
        'family-app family-app__canvas h-[100dvh] overflow-hidden antialiased',
        fontClassName,
        fontVariable,
      )}
      suppressHydrationWarning
    >
      <FamilyThemeBoot />
      <FamilyMediaPlayerProvider>
        <FamilyActionCelebrateProvider>
          <div className="family-app__frame relative mx-auto flex h-[100dvh] w-full flex-col overflow-hidden lg:my-3 lg:h-[calc(100dvh-1.5rem)]">
            {children}
          </div>
        </FamilyActionCelebrateProvider>
      </FamilyMediaPlayerProvider>
    </div>
  );
}
