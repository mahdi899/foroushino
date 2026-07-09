'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { PanelNavLabel } from './PanelNavLabel';
import { PANEL_BOTTOM_NAV_ITEMS } from './panelNav';

export function PanelBottomNav({
  unreadCount = 0,
  onMenuOpen,
}: {
  unreadCount?: number;
  onMenuOpen: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <nav className="panel-bottom-nav fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface lg:hidden">
      {PANEL_BOTTOM_NAV_ITEMS.map((item) => {
        const { href, label, shortLabel, icon: Icon, exact } = item;
        const active = isActive(href, exact);
        const showBadge = href === '/panel/notifications' && unreadCount > 0;
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-all duration-300 ${
              active ? 'text-primary' : 'text-text-muted'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
            <PanelNavLabel label={shortLabel ?? label} />
            {showBadge ? (
              <span
                className="absolute end-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                style={{ background: 'var(--color-gold)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onMenuOpen}
        className="flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-text-muted transition-all duration-300 hover:text-primary"
        aria-label="باز کردن منو"
      >
        <Menu size={20} strokeWidth={1.8} />
        <span>منو</span>
      </button>
    </nav>
  );
}
