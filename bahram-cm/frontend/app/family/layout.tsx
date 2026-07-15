import type { Metadata, Viewport } from 'next';
import { FamilyMediaPlayerProvider } from '@/lib/family/FamilyMediaPlayerContext';

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
  themeColor: '#0b0f10',
};

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#070b0d] text-bone antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 hidden lg:block"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(201,162,39,0.04) 0%, transparent 40%)',
        }}
      />
      <FamilyMediaPlayerProvider>
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[680px] flex-col bg-charcoal lg:border-x lg:border-white/[0.08] lg:shadow-[0_0_80px_rgba(0,0,0,0.45)]">
          {children}
        </div>
      </FamilyMediaPlayerProvider>
    </div>
  );
}
