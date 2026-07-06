import '@/styles/admin.css';
import { AdminThemeProvider } from './(panel)/AdminThemeContext';

const ADMIN_THEME_BOOT = `(function(){try{var t=localStorage.getItem('bahram-admin-theme');var s=localStorage.getItem('bahram-admin-sidebar');var el=document.getElementById('admin-root');if(el){el.setAttribute('data-admin-theme',t==='dark'?'dark':'light');if(s==='1')el.setAttribute('data-sidebar-collapsed','1');}}catch(e){}})();`;

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <div id="admin-root" className="admin-root" data-admin-theme="light" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_BOOT }} />
        {children}
      </div>
    </AdminThemeProvider>
  );
}
