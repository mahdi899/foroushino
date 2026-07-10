import '@/styles/panel.css';
import type { Metadata, Viewport } from 'next';
import { PanelThemeBoot } from './PanelThemeContext';

export const metadata: Metadata = {
  title: 'پنل کاربری | آکادمی بهرام رستمی',
  description: 'دوره‌ها، سمینارها، پشتیبانی و اعلان‌های آکادمی',
  robots: { index: false, follow: false },
  manifest: '/panel-manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'پنل آکادمی',
  },
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
    { media: '(prefers-color-scheme: dark)', color: '#050a0b' },
    { media: '(prefers-color-scheme: light)', color: '#f4f8f8' },
  ],
};

export default function PanelRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="panel-root" className="panel-root" data-panel-theme="dark" dir="rtl" suppressHydrationWarning>
      <PanelThemeBoot />
      {children}
    </div>
  );
}
