'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Menu } from 'lucide-react';
import { PanelThemeToggle } from '@/app/panel/PanelThemeToggle';
import { PanelProfileAvatar } from '@/components/student-panel/layout/PanelProfileAvatar';
import { logoutStudentAction } from '@/lib/student/actions';
import { markAllNotificationsReadAction } from '@/lib/student/panelActions';
import type { StudentUser } from '@/lib/student/session';

export function PanelHeader({
  user,
  unreadCount = 0,
  onMenuOpen,
}: {
  user: StudentUser;
  unreadCount?: number;
  onMenuOpen: () => void;
}) {
  const router = useRouter();
  const fullName = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim();
  const displayName = fullName || user.name;
  const profileSubtitle = fullName ? 'دانشجو' : user.mobile;

  async function handleNotificationsClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (unreadCount <= 0) return;
    e.preventDefault();
    await markAllNotificationsReadAction();
    router.push('/panel/notifications');
    router.refresh();
  }

  return (
    <header className="panel-header flex items-center justify-between gap-2 border-b border-border bg-surface/80 py-3 backdrop-blur-md md:gap-4 md:px-6">
      {/* RTL: start = right — actions stay on the right */}
      <div className="flex items-center gap-2 md:gap-3">
        <button type="button" className="btn-ghost md:hidden" onClick={onMenuOpen} aria-label="باز کردن منو">
          <Menu size={22} />
        </button>
        <Link
          href="/panel/notifications"
          onClick={handleNotificationsClick}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 bg-surface-soft text-text-muted transition-all duration-300 hover:text-text hover:scale-[1.05]"
        >
          <Bell size={18} />
          {unreadCount > 0 ? (
            <span
              className="absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-[#111] ring-2 ring-surface"
              style={{ background: 'var(--color-gold)' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Link>
        <PanelThemeToggle />
      </div>

      {/* RTL: end = left — profile block on the left */}
      <div className="flex items-center gap-2">
        <Link
          href="/panel/profile"
          className="group flex items-center gap-3 rounded-xl border border-border/40 bg-surface-soft/50 py-1.5 pe-2 ps-1.5 transition-all duration-300 hover:border-border hover:bg-surface-soft"
        >
          <PanelProfileAvatar
            avatar={user.profile?.avatar}
            seed={user.name || user.mobile}
            alt={displayName}
          />
          <div className="hidden min-w-0 text-right md:block">
            <div className="flex items-center gap-1 text-xs font-bold text-text">
              <span className="truncate">{displayName}</span>
              <ChevronDown size={14} className="shrink-0 text-text-muted transition-transform group-hover:translate-y-0.5" />
            </div>
            <div className="mt-0.5 truncate text-[10px] text-text-muted" dir={fullName ? undefined : 'ltr'}>
              {profileSubtitle}
            </div>
          </div>
        </Link>

        <form action={logoutStudentAction}>
          <button
            type="submit"
            className="flex h-10 items-center gap-2 rounded-xl border border-border/40 bg-surface-soft/50 px-3 text-xs font-medium text-text-muted transition-all duration-300 hover:border-red-400/30 hover:bg-red-500/5 hover:text-red-400"
            aria-label="خروج از حساب"
          >
            <LogOut size={16} />
            <span className="hidden lg:inline">خروج</span>
          </button>
        </form>
      </div>
    </header>
  );
}
