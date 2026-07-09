'use client';

import Link from 'next/link';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { logoutAction } from '@/lib/auth/actions';
import { cn } from '@/lib/utils';
import { AdminThemeToggle } from '@/app/admin/(panel)/AdminThemeToggle';
import { AdminHeaderSaveBar } from '@/app/admin/(panel)/AdminHeaderSaveBar';

export function AdminHeader({
  sidebarCollapsed,
  onMenuOpen,
  onToggleSidebar,
}: {
  sidebarCollapsed: boolean;
  onMenuOpen: () => void;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="admin-header">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          className="admin-header__icon-btn lg:hidden"
          onClick={onMenuOpen}
          aria-label="منو"
        >
          <AdminLucideIcon name="Menu" className="h-5 w-5" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="admin-header__icon-btn hidden lg:grid"
          onClick={onToggleSidebar}
          aria-label="جمع/باز کردن منو"
        >
          <AdminLucideIcon
            name="PanelRightClose"
            className={cn('h-5 w-5 transition', sidebarCollapsed && 'rotate-180')}
            strokeWidth={2}
          />
        </button>
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
        <div className="admin-header-user-chip flex items-center gap-1.5 rounded-pill p-0.5">
          <AdminThemeToggle />
        </div>
        <Link
          href="/"
          target="_blank"
          className="admin-text-meta hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-text-muted transition hover:bg-surface-soft hover:text-primary sm:flex"
        >
          <AdminLucideIcon name="ExternalLink" className="h-3.5 w-3.5" strokeWidth={2} />
          <span>مشاهده سایت</span>
        </Link>
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
