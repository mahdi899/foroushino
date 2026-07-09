import '@/styles/admin.css';
import { AdminThemeBoot, AdminThemeProvider } from './(panel)/AdminThemeContext';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <div id="admin-root" className="admin-root" data-admin-theme="light" suppressHydrationWarning>
        <AdminThemeBoot />
        {children}
      </div>
    </AdminThemeProvider>
  );
}
