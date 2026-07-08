'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BadgeCheck, BookOpen, Gift, Home, LifeBuoy, LogOut, Menu, Bell, User as UserIcon, Receipt, X, GraduationCap, Search, Download, ChevronDown,
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
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="mb-8 flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GraduationCap size={20} className="text-primary" />
                </div>
                <span className="text-base font-bold text-text">پنل آکادمی</span>
              </div>
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
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {/* App Download Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 p-4 border border-border/60">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-primary">اپلیکیشن پنل آکادمی</span>
                <span className="text-[10px] text-text-muted leading-relaxed">
                  یادگیری در هر زمان، ادامه یادگیری در اپلیکیشن
                </span>
                <button type="button" className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                  <Download size={12} />
                  دانلود اپلیکیشن
                </button>
              </div>
              {/* Decorative background circle */}
              <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-primary/10 blur-xl" />
            </div>

            <form action={logoutStudentAction} className="border-t border-border pt-4">
              <button type="submit" className="btn btn-ghost w-full justify-start gap-3 px-3 text-sm text-text-muted hover:text-red-500">
                <LogOut size={18} />
                خروج از حساب
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="panel-main flex flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 md:px-6">
          <div className="flex items-center gap-3 flex-1">
            <button
              type="button"
              className="btn-ghost md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="باز کردن منو"
            >
              <Menu size={22} />
            </button>

            {/* Search Bar */}
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="جستجو در دوره‌ها، مسیرها، مطالب و..."
                className="w-full rounded-xl border border-border/80 bg-surface-soft py-2 pl-4 pr-10 text-xs text-text placeholder-text-muted/60 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <PanelThemeToggle />

            {/* Notifications */}
            <Link
              href="/panel/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-surface-soft text-text-muted hover:text-primary transition-colors border border-border/40"
            >
              <Bell size={18} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
            </Link>

            {/* User Profile Dropdown */}
            <div className="flex items-center gap-3 border-r border-border/80 pr-4">
              <div className="hidden text-left md:block">
                <div className="text-xs font-bold text-text">
                  {user.profile?.first_name || user.name}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 text-right">دانشجو</div>
              </div>
              <div className="h-9 w-9 overflow-hidden rounded-xl bg-primary/10 ring-2 ring-primary/20">
                <img
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
