'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PANEL_BOTTOM_NAV_ITEMS } from './panelNav';

function NavIcon({
  icon: Icon,
  active,
}: {
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        'site-bottom-nav__icon-shell',
        active && 'site-bottom-nav__icon-shell--active',
      )}
    >
      <Icon
        size={18}
        strokeWidth={active ? 2.35 : 1.9}
        className="site-bottom-nav__icon"
        aria-hidden
      />
    </span>
  );
}

export function PanelBottomNav({
  unreadCount = 0,
  menuOpen = false,
  onMenuOpen,
}: {
  unreadCount?: number;
  menuOpen?: boolean;
  onMenuOpen: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <nav
      aria-label="ناوبری پنل"
      className="site-bottom-nav panel-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 lg:hidden"
    >
      {PANEL_BOTTOM_NAV_ITEMS.map((item) => {
        const { href, label, shortLabel, icon, exact } = item;
        const active = isActive(href, exact);
        const showBadge = href === '/panel/notifications' && unreadCount > 0;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'site-bottom-nav__item relative flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 px-1',
              active && 'site-bottom-nav__item--active',
            )}
          >
            <span className="panel-bottom-nav__icon-wrap">
              <NavIcon icon={icon} active={active} />
              {showBadge ? (
                <span className="panel-bottom-nav__badge" aria-hidden>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </span>
            <span className="site-bottom-nav__label">{shortLabel ?? label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onMenuOpen}
        aria-expanded={menuOpen}
        aria-label="باز کردن منو"
        className={cn(
          'site-bottom-nav__item flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 px-1',
          menuOpen && 'site-bottom-nav__item--active',
        )}
      >
        <NavIcon icon={Menu} active={menuOpen} />
        <span className="site-bottom-nav__label">منو</span>
      </button>
    </nav>
  );
}
