import '@/styles/admin.css';
import { BareShellServiceWorkerCleanup } from '@/components/pwa/BareShellServiceWorkerCleanup';
import { AdminThemeBoot, AdminThemeProvider } from './(panel)/AdminThemeContext';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <BareShellServiceWorkerCleanup />
      <div id="admin-root" className="admin-root" data-admin-theme="light" suppressHydrationWarning>
        <AdminThemeBoot />
        {children}
      </div>
    </AdminThemeProvider>
  );
}
