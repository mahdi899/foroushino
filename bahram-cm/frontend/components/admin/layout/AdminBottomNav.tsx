'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { cn } from '@/lib/utils';
import { isAdminNavActive } from '@/app/admin/(panel)/admin-nav';
import { adminNavBadgeCountForHref, type AdminNavBadgeCounts } from '@/lib/admin/navBadges';

const ADMIN_BOTTOM_NAV_ITEMS = [
  { href: '/admin', label: 'داشبورد', shortLabel: 'خانه', icon: 'LayoutDashboard', exact: true },
  { href: '/admin/chatbot', label: 'چت‌بات', shortLabel: 'چت', icon: 'MessageSquare' },
  { href: '/admin/academy/tickets', label: 'تیکت‌ها', shortLabel: 'تیکت', icon: 'LifeBuoy' },
  { href: '/admin/leads', label: 'لیدها', shortLabel: 'لید', icon: 'Inbox' },
] as const;

function NavIcon({
  name,
  active,
}: {
  name: string;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        'site-bottom-nav__icon-shell',
        active && 'site-bottom-nav__icon-shell--active',
      )}
    >
      <AdminLucideIcon
        name={name}
        size={18}
        strokeWidth={active ? 2.35 : 1.9}
        className="site-bottom-nav__icon"
      />
    </span>
  );
}

export function AdminBottomNav({
  navBadgeCounts,
  menuOpen = false,
  onMenuOpen,
}: {
  navBadgeCounts: AdminNavBadgeCounts;
  menuOpen?: boolean;
  onMenuOpen: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ناوبری مدیریت"
      className="site-bottom-nav admin-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 lg:hidden"
    >
      {ADMIN_BOTTOM_NAV_ITEMS.map((item) => {
        const active =
          item.href === '/admin'
            ? pathname === '/admin'
            : isAdminNavActive(pathname, item.href, true);
        const badgeCount = adminNavBadgeCountForHref(item.href, navBadgeCounts);
        const showBadge = badgeCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'site-bottom-nav__item relative flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 sm:px-1',
              active && 'site-bottom-nav__item--active',
            )}
          >
            <span className="admin-bottom-nav__icon-wrap">
              <NavIcon name={item.icon} active={active} />
              {showBadge ? (
                <span className="admin-bottom-nav__badge" aria-hidden>
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              ) : null}
            </span>
            <span className="site-bottom-nav__label">{item.shortLabel}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onMenuOpen}
        aria-expanded={menuOpen}
        aria-label="باز کردن منو"
        className={cn(
          'site-bottom-nav__item flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 sm:px-1',
          menuOpen && 'site-bottom-nav__item--active',
        )}
      >
        <NavIcon name="Menu" active={menuOpen} />
        <span className="site-bottom-nav__label">منو</span>
      </button>
    </nav>
  );
}
