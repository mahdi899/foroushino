import type { Metadata, Viewport } from 'next';
import { FamilyMediaPlayerProvider } from '@/lib/family/FamilyMediaPlayerContext';

export const metadata: Metadata = {
  title: 'خانواده داداش بهرام',
  description: 'فضای نزدیک داداش بهرام با اعضای خانواده — پست، صوت، ویدیو و گفتگو.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0f10',
};

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="min-h-[100dvh] bg-charcoal text-bone antialiased">
      <FamilyMediaPlayerProvider>
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col sm:border-x sm:border-white/10">
          {children}
        </div>
      </FamilyMediaPlayerProvider>
    </div>
  );
}
