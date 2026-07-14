'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FamilyMain, FamilyShell } from '@/components/family/FamilyShell';
import { useFamilyNotifications } from '@/lib/family/hooks/useFamilyNotifications';
import { cn } from '@/lib/cn';

export default function FamilyNotificationsPage() {
  const { notifications, isLoading, markRead, markAllRead } = useFamilyNotifications(true);

  return (
    <FamilyShell>
      <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-white/10 bg-charcoal/95 px-4 py-3 backdrop-blur-md sm:px-5 lg:px-6 lg:py-3.5">
        <Link href="/family" className="flex items-center gap-2 text-bone">
          <ArrowRight className="h-4 w-4 rtl-flip" />
          <span className="text-sm font-semibold lg:text-[15px]">اعلان‌ها</span>
        </Link>
        {notifications.length > 0 && (
          <button type="button" onClick={() => markAllRead()} className="text-xs text-gold/80 hover:text-gold lg:text-sm">
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </button>
        )}
      </header>

      <FamilyMain className="px-3 py-3 sm:px-4 lg:px-5 lg:py-4">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <p className="py-16 text-center text-sm text-bone/50">اعلانی نداری.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => {
              const content = (
                <div
                  className={cn(
                    'rounded-2xl border px-4 py-3 transition',
                    n.read_at ? 'border-white/10 bg-white/[0.02]' : 'border-gold/30 bg-gold/[0.06]',
                  )}
                >
                  <p className="text-sm font-semibold text-bone">{n.title}</p>
                  <p className="mt-1 text-xs leading-5 text-bone/60">{n.body}</p>
                </div>
              );

              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link href={n.link} onClick={() => !n.read_at && markRead(n.id)}>
                      {content}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => !n.read_at && markRead(n.id)} className="block w-full text-right">
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </FamilyMain>
    </FamilyShell>
  );
}
