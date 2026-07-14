'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useFamilyNotifications } from '@/lib/family/hooks/useFamilyNotifications';
import { cn } from '@/lib/cn';

export default function FamilyNotificationsPage() {
  const { notifications, isLoading, markRead, markAllRead } = useFamilyNotifications(true);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-charcoal/90 px-4 py-3 backdrop-blur-md">
        <Link href="/family" className="flex items-center gap-2 text-bone">
          <ArrowRight className="h-4 w-4 rtl-flip" />
          <span className="text-sm font-semibold">اعلان‌ها</span>
        </Link>
        {notifications.length > 0 && (
          <button type="button" onClick={() => markAllRead()} className="text-xs text-gold/80 hover:text-gold">
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </button>
        )}
      </header>

      <div className="flex-1 px-3 py-3">
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
      </div>
    </div>
  );
}
