'use client';

import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { logoutAction } from '@/lib/auth/actions';
import { AdminThemeToggle } from '@/app/admin/(panel)/AdminThemeToggle';
import { AdminHeaderSaveBar } from '@/app/admin/(panel)/AdminHeaderSaveBar';

export function AdminHeader() {
  return (
    <header className="admin-header">
      <div className="admin-header__lead lg:hidden">
        <p className="admin-header__title truncate">پنل بهرام</p>
      </div>
      <div className="admin-header__trail">
        <AdminThemeToggle />
        {/* Plain <a> + new tab: never soft-nav from bare /admin shell into the marketing site. */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-text-meta hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-text-muted transition hover:bg-surface-soft hover:text-primary sm:flex"
        >
          <AdminLucideIcon name="ExternalLink" className="h-3.5 w-3.5" strokeWidth={2} />
          <span>مشاهده سایت</span>
        </a>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-secondary admin-text-meta px-2.5 py-1.5 sm:px-3">
            <AdminLucideIcon name="LogOut" className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </form>
        <AdminHeaderSaveBar />
      </div>
    </header>
  );
}
