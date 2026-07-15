import type { Metadata, Viewport } from 'next';
import { FamilyMediaPlayerProvider } from '@/lib/family/FamilyMediaPlayerContext';
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
    { media: '(prefers-color-scheme: light)', color: '#f4f8f8' },
    { media: '(prefers-color-scheme: dark)', color: '#050a0b' },
  ],
};

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="family-root"
      dir="rtl"
      data-family-theme={DEFAULT_SITE_THEME}
      className="family-app family-app__canvas h-[100dvh] overflow-hidden antialiased"
      suppressHydrationWarning
    >
      <FamilyThemeBoot />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 hidden lg:block"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--family-accent) 6%, transparent) 0%, transparent 55%), radial-gradient(circle at 20% 80%, color-mix(in oklab, var(--family-gold) 5%, transparent) 0%, transparent 40%)',
        }}
      />
      <FamilyMediaPlayerProvider>
        <div className="family-app__frame relative mx-auto flex h-[100dvh] w-full max-w-[680px] flex-col overflow-hidden lg:my-3 lg:h-[calc(100dvh-1.5rem)] lg:max-w-[min(1280px,calc(100%-2rem))] lg:rounded-2xl">
          {children}
        </div>
      </FamilyMediaPlayerProvider>
    </div>
  );
}
