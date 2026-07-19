'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { adminNav, isAdminNavActive, type AdminNavItem } from '@/app/admin/(panel)/admin-nav';
import { adminNavBadgeCountForHref, type AdminNavBadgeCounts } from '@/lib/admin/navBadges';
import { BrandMark } from '@/components/layout/Header';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { cn } from '@/lib/utils';

function NavIcon({ name, className }: { name: string; className?: string }) {
  return <AdminLucideIcon name={name} className={cn('h-[18px] w-[18px] shrink-0', className)} />;
}

export function AdminSidebar({
  nav = adminNav,
  collapsed,
  onToggleCollapse,
  navBadgeCounts,
}: {
  nav?: { group: string; items: AdminNavItem[] }[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  navBadgeCounts: AdminNavBadgeCounts;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'admin-sidebar fixed inset-y-0 right-0 z-40 hidden flex-col overflow-hidden border-l border-border bg-surface shadow-soft lg:flex',
        collapsed && 'admin-sidebar--collapsed',
      )}
    >
      <div
        className={cn(
          'admin-sidebar__brand flex shrink-0 items-center border-b border-border',
          collapsed ? 'flex-col justify-center gap-2 p-3' : 'justify-between gap-2 px-4 py-3',
        )}
      >
        <div className={cn('flex min-w-0 items-center gap-2.5', collapsed && 'justify-center')}>
          <BrandMark />
          {!collapsed && (
            <div className="min-w-0">
              <p className="admin-sidebar__brand-text truncate">پنل بهرام</p>
              <p className="admin-sidebar__brand-sub">پنل مدیریت</p>
            </div>
          )}
        </div>
        <button
          type="button"
          className="admin-sidebar__toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'باز کردن منو' : 'جمع کردن منو'}
          title={collapsed ? 'باز کردن منو' : 'جمع کردن منو'}
        >
          {collapsed ? <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} /> : <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2} />}
        </button>
      </div>

      <nav className="admin-sidebar-nav flex-1 overflow-y-auto overflow-x-hidden p-2">
        {nav.map((group) => (
          <div key={group.group} className="mb-3">
            {!collapsed && <p className="admin-sidebar__group-label">{group.group}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isAdminNavActive(pathname, item.href, item.matchPrefix);
                const navAlertCount = adminNavBadgeCountForHref(item.href, navBadgeCounts);
                const showQueueAlert = navAlertCount > 0;
                const isImportant = 'emphasis' in item && item.emphasis;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      data-active={active}
                      className={cn(
                        'admin-nav-item flex items-center rounded-lg font-medium',
                        collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2',
                        active ? '' : 'text-text-muted hover:bg-surface-soft hover:text-primary',
                        showQueueAlert && 'admin-nav-queue-alert',
                        isImportant && 'admin-nav-important',
                      )}
                    >
                      <span className="relative shrink-0">
                        <NavIcon name={item.icon} className={cn('admin-nav-icon', active && 'text-inherit')} />
                        {showQueueAlert && collapsed && (
                          <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-surface" />
                        )}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {showQueueAlert && (
                            <span className="admin-nav-item__badge mr-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-white">
                              {navAlertCount > 99 ? '99+' : navAlertCount}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
