'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNav, isAdminNavActive } from '@/app/admin/(panel)/admin-nav';
import { BrandMark } from '@/components/layout/Header';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { cn } from '@/lib/utils';

function NavIcon({ name, className }: { name: string; className?: string }) {
  return <AdminLucideIcon name={name} className={cn('h-[18px] w-[18px] shrink-0', className)} />;
}

export function AdminSidebar({
  collapsed,
  onToggleCollapse,
  pendingCount,
  ticketPendingCount,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  pendingCount: number;
  ticketPendingCount: number;
}) {
  const pathname = usePathname();

  return (
    <aside className={cn('admin-sidebar fixed inset-y-0 right-0 z-40 hidden flex-col overflow-hidden border-l border-border bg-surface shadow-soft lg:flex', collapsed && 'admin-sidebar--collapsed')}>
      <div className={cn('flex shrink-0 items-center border-b border-border', collapsed ? 'justify-center p-3' : 'gap-2.5 p-4')}>
        <BrandMark />
        {!collapsed && (
          <div className="min-w-0">
            <p className="admin-sidebar__brand-text truncate">پنل بهرام</p>
            <p className="admin-sidebar__brand-sub">مدیریت محتوا</p>
          </div>
        )}
      </div>

      <nav className="admin-sidebar-nav flex-1 overflow-y-auto overflow-x-hidden p-2">
        {adminNav.map((group) => (
          <div key={group.group} className="mb-3">
            {!collapsed && <p className="admin-sidebar__group-label">{group.group}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isAdminNavActive(pathname, item.href, item.matchPrefix);
                const isChatbotNav = item.href === '/admin/chatbot';
                const isTicketsNav = item.href === '/admin/academy/tickets';
                const navAlertCount = isChatbotNav ? pendingCount : isTicketsNav ? ticketPendingCount : 0;
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

      <div className={cn('shrink-0 border-t border-border p-2', collapsed ? 'flex flex-col items-center gap-1' : 'space-y-1')}>
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'باز کردن منو' : 'جمع کردن منو'}
          className="admin-text-meta flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-text-muted transition hover:bg-surface-soft hover:text-primary"
        >
          {collapsed ? (
            <AdminLucideIcon name="PanelRightOpen" className="h-4 w-4" strokeWidth={2} />
          ) : (
            <>
              <AdminLucideIcon name="PanelRightClose" className="h-4 w-4" strokeWidth={2} />
              <span>جمع کردن منو</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
