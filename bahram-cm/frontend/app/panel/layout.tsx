import '@/styles/panel.css';
import type { Metadata } from 'next';
import { PanelThemeProvider } from './PanelThemeContext';

export const metadata: Metadata = {
  title: 'پنل کاربری | آکادمی بهرام رستمی',
  robots: { index: false, follow: false },
};

export default function PanelRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <PanelThemeProvider>
      <div id="panel-root" className="panel-root" data-panel-theme="light" dir="rtl" suppressHydrationWarning>
        {children}
      </div>
    </PanelThemeProvider>
  );
}
