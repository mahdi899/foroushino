'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, X } from 'lucide-react';
import { adminNav, isAdminNavActive, type AdminNavItem } from '@/app/admin/(panel)/admin-nav';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { cn } from '@/lib/utils';

export function AdminMobileMenu({
  nav = adminNav,
  open,
  onClose,
  pendingCount,
  ticketPendingCount,
}: {
  nav?: { group: string; items: AdminNavItem[] }[];
  open: boolean;
  onClose: () => void;
  pendingCount: number;
  ticketPendingCount: number;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn('admin-mobile-menu__scrim lg:hidden', open && 'admin-mobile-menu__scrim--open')}
        onClick={onClose}
        aria-hidden={!open}
      />

      <div
        className={cn('admin-mobile-menu lg:hidden', open && 'admin-mobile-menu--open')}
        role="dialog"
        aria-modal="true"
        aria-label="منوی پنل ادمین"
        aria-hidden={!open}
      >
        <div className="admin-mobile-menu__handle" aria-hidden />
        <div className="admin-mobile-menu__header">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Settings size={20} />
            </span>
            <div className="min-w-0">
              <p className="admin-card-title">منوی ادمین</p>
              <p className="admin-section-subtitle">دسترسی سریع به بخش‌ها</p>
            </div>
          </div>
          <button type="button" className="admin-header__icon-btn" onClick={onClose} aria-label="بستن منو">
            <X size={20} />
          </button>
        </div>

        <div className="admin-mobile-menu__body">
          {nav.map((group) => (
            <div key={group.group} className="admin-mobile-nav-group">
              <p className="admin-mobile-nav-group__label">{group.group}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isAdminNavActive(pathname, item.href, item.matchPrefix);
                  const isChatbotNav = item.href === '/admin/chatbot';
                  const isTicketsNav = item.href === '/admin/academy/tickets';
                  const navAlertCount = isChatbotNav ? pendingCount : isTicketsNav ? ticketPendingCount : 0;
                  const isImportant = 'emphasis' in item && item.emphasis;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        data-active={active}
                        className={cn(
                          'admin-mobile-nav-item',
                          isImportant && !active && 'text-red-600',
                        )}
                      >
                        <span className="admin-mobile-nav-item__icon">
                          <AdminLucideIcon
                            name={item.icon}
                            size={18}
                            strokeWidth={active ? 2.25 : 1.9}
                          />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {navAlertCount > 0 ? (
                          <span className="admin-nav-item__badge flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-white">
                            {navAlertCount > 99 ? '99+' : navAlertCount}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
