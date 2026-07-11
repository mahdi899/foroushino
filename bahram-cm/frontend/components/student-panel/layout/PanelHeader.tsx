'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, Home, LogOut } from 'lucide-react';
import { PanelThemeToggle } from '@/app/panel/PanelThemeToggle';
import { PanelProfileAvatar } from '@/components/student-panel/layout/PanelProfileAvatar';
import { studentDefaultAvatarUrl } from '@/lib/student/avatar';
import { useStudentAuth } from '@/components/student-panel/auth/StudentAuthContext';
import { getStudentDisplayName, getStudentLegalName } from '@/lib/student/displayName';
import { isProfileVerified } from '@/lib/student/profileCompletion';
import { logoutStudentAction } from '@/lib/student/actions';
import { markAllNotificationsReadAction } from '@/lib/student/panelActions';
import type { StudentUser } from '@/lib/student/session';

export function PanelHeader({
  user,
  unreadCount = 0,
}: {
  user: StudentUser;
  unreadCount?: number;
}) {
  const router = useRouter();
  const { markLoggedOut } = useStudentAuth();
  const displayName = getStudentDisplayName(user);
  const profileSubtitle = getStudentLegalName(user) ? 'دانشجو' : user.mobile;

  async function handleNotificationsClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (unreadCount <= 0) return;
    e.preventDefault();
    await markAllNotificationsReadAction();
    router.push('/panel/notifications');
    router.refresh();
  }

  return (
    <header className="panel-header border-b border-border bg-surface/80 py-3 backdrop-blur-md">
      <div className="panel-header__lead">
        <Link
          href="/panel/notifications"
          onClick={handleNotificationsClick}
          className="panel-header__icon-btn"
          aria-label="اعلان‌ها"
        >
          <Bell size={18} />
          {unreadCount > 0 ? (
            <span className="panel-header__badge" aria-hidden>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Link>

        <Link href="/panel/profile" className="panel-header__profile group">
          <PanelProfileAvatar
            avatar={user.profile?.avatar}
            avatarUrl={user.profile?.avatar_url}
            gravatarUrl={user.profile?.gravatar_url}
            defaultAvatarUrl={user.profile?.default_avatar_url ?? studentDefaultAvatarUrl(user.id)}
            alt={displayName}
            className="!h-8 !w-8"
            verified={isProfileVerified(user)}
          />
          <span className="panel-header__profile-text">
            <span className="panel-header__profile-name">{displayName}</span>
            <span className="panel-header__profile-role" dir={getStudentLegalName(user) ? undefined : 'ltr'}>
              {profileSubtitle}
            </span>
          </span>
          <ChevronDown size={14} className="hidden shrink-0 text-text-muted md:block" aria-hidden />
        </Link>
      </div>

      <div className="panel-header__trail">
        <PanelThemeToggle />
        <Link href="/" className="panel-header__home" aria-label="بازگشت به صفحه اصلی سایت">
          <Home size={16} />
          <span className="hidden sm:inline">سایت</span>
        </Link>
        <form action={logoutStudentAction}>
          <button
            type="submit"
            className="panel-header__logout"
            aria-label="خروج از حساب"
            onClick={() => markLoggedOut()}
          >
            <LogOut size={16} />
            <span className="hidden lg:inline">خروج</span>
          </button>
        </form>
      </div>
    </header>
  );
}
