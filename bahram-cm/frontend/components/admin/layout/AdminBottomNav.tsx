'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { cn } from '@/lib/utils';
import { isAdminNavActive } from '@/app/admin/(panel)/admin-nav';

const ADMIN_BOTTOM_NAV_ITEMS = [
  { href: '/admin', label: 'داشبورد', shortLabel: 'خانه', icon: 'LayoutDashboard', exact: true },
  { href: '/admin/chatbot', label: 'چت‌بات', shortLabel: 'چت', icon: 'MessageSquare' },
  { href: '/admin/academy/tickets', label: 'تیکت‌ها', shortLabel: 'تیکت', icon: 'LifeBuoy' },
  { href: '/admin/leads', label: 'لیدها', shortLabel: 'لید', icon: 'Inbox' },
] as const;

export function AdminBottomNav({
  pendingCount,
  ticketPendingCount,
  onMenuOpen,
}: {
  pendingCount: number;
  ticketPendingCount: number;
  onMenuOpen: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="admin-bottom-nav lg:hidden">
      {ADMIN_BOTTOM_NAV_ITEMS.map((item) => {
        const active =
          item.href === '/admin'
            ? pathname === '/admin'
            : isAdminNavActive(pathname, item.href, true);
        const showBadge =
          (item.href === '/admin/chatbot' && pendingCount > 0) ||
          (item.href === '/admin/academy/tickets' && ticketPendingCount > 0);
        const badgeCount = item.href === '/admin/chatbot' ? pendingCount : ticketPendingCount;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 font-medium transition-all duration-300',
              active ? 'text-primary' : 'text-text-muted',
            )}
          >
            <AdminLucideIcon name={item.icon} className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
            <span>{item.shortLabel}</span>
            {showBadge ? (
              <span className="admin-bottom-nav__badge absolute end-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-bold text-white">
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onMenuOpen}
        className="flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 font-medium text-text-muted transition-all duration-300 hover:text-primary"
        aria-label="باز کردن منو"
      >
        <Menu size={20} strokeWidth={1.8} />
        <span>منو</span>
      </button>
    </nav>
  );
}
