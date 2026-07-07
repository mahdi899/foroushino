'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BadgeCheck, BookOpen, Gift, Home, LifeBuoy, LogOut, Menu, Bell, User as UserIcon, Receipt, X,
} from 'lucide-react';
import { PanelThemeToggle } from '@/app/panel/PanelThemeToggle';
import { logoutStudentAction } from '@/lib/student/actions';
import type { StudentUser } from '@/lib/student/session';

const NAV_ITEMS = [
  { href: '/panel', label: 'خانه', icon: Home, exact: true },
  { href: '/panel/courses', label: 'دوره من', icon: BookOpen },
  { href: '/panel/orders', label: 'سفارش‌های من', icon: Receipt },
  { href: '/panel/seminars', label: 'سمینارهای من', icon: BadgeCheck },
  { href: '/panel/referrals', label: 'باشگاه مشتریان', icon: Gift },
  { href: '/panel/sat', label: 'سات', icon: BadgeCheck },
  { href: '/panel/support', label: 'پشتیبانی', icon: LifeBuoy },
  { href: '/panel/notifications', label: 'اعلان‌ها', icon: Bell },
  { href: '/panel/profile', label: 'پروفایل', icon: UserIcon },
] as const;

export function PanelShell({ user, children }: { user: StudentUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <div className="panel-shell">
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={`panel-sidebar fixed inset-y-0 right-0 z-40 w-64 shrink-0 border-l p-4 transition-transform md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-1">
          <span className="text-base font-bold text-text">آکادمی بهرام رستمی</span>
          <button type="button" className="btn-ghost md:hidden" onClick={() => setMobileOpen(false)} aria-label="بستن منو">
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              data-active={isActive(href, exact)}
              className="panel-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text"
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <form action={logoutStudentAction} className="mt-6 border-t border-border pt-4">
          <button type="submit" className="btn btn-ghost w-full justify-start gap-3 px-3 text-sm">
            <LogOut size={18} />
            خروج از حساب
          </button>
        </form>
      </aside>

      <div className="panel-main flex flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 md:px-6">
          <button
            type="button"
            className="btn-ghost md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="باز کردن منو"
          >
            <Menu size={22} />
          </button>
          <div className="hidden text-sm text-text-muted md:block">
            سلام {user.profile?.first_name || user.name} 👋
          </div>
          <div className="flex items-center gap-3">
            <PanelThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
