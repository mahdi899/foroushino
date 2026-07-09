'use client';

import Link from 'next/link';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { logoutAction } from '@/lib/auth/actions';
import { AdminThemeToggle } from '@/app/admin/(panel)/AdminThemeToggle';
import { AdminHeaderSaveBar } from '@/app/admin/(panel)/AdminHeaderSaveBar';

export function AdminHeader() {
  return (
    <header className="admin-header admin-header--trail-only">
      <div className="admin-header__trail">
        <AdminThemeToggle />
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
