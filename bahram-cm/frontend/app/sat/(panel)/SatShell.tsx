'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Phone,
  UserCog,
  Users,
  Wallet,
  Link as LinkIcon,
} from 'lucide-react';
import type { SatUser } from '@/lib/sat/session';
import { filterSatNav } from './sat-nav';

const ICONS = {
  LayoutDashboard,
  Users,
  Phone,
  ClipboardList,
  UserCog,
  Wallet,
  Link: LinkIcon,
} as const;

type Props = {
  user: SatUser;
  children: React.ReactNode;
};

export function SatShell({ user, children }: Props) {
  const pathname = usePathname();
  const nav = filterSatNav(user);

  async function logout() {
    await fetch('/api/sat/logout', { method: 'POST' });
    window.location.href = '/sat/login';
  }

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <header className="border-b border-gold/15 bg-obsidian/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs text-gold/80">سیستم عملیاتی فروش</p>
            <h1 className="text-lg font-semibold">پنل سات</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full border border-gold/20 px-3 py-1 text-gold">
              {user.role_label ?? 'پرسنل'}
            </span>
            <span>{user.name}</span>
            <button type="button" onClick={logout} className="inline-flex items-center gap-1 text-bone/70 hover:text-bone">
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS] ?? LayoutDashboard;
            const active = pathname === item.href || (item.href !== '/sat' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  active ? 'bg-gold/15 text-gold' : 'text-bone/75 hover:bg-white/5 hover:text-bone'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
