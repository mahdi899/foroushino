import Link from 'next/link';
import { Bell, BookOpen, ChevronLeft, FileText, MessageSquare, Receipt, Sparkles, KeyRound } from 'lucide-react';
import type { NotificationEntry } from '@/components/student-panel/notifications/NotificationItem';
import { formatRelativeTimeFa } from '@/components/student-panel/utils/relativeTime';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';

const DOT_CYCLE: Array<'blue' | 'green' | 'orange'> = ['blue', 'green', 'orange'];

function typeIcon(type: string | null | undefined) {
  switch (type) {
    case 'order_paid':
      return Receipt;
    case 'license_ready':
      return KeyRound;
    case 'ticket_created':
    case 'ticket_reply':
      return MessageSquare;
    case 'product_new':
      return Sparkles;
    case 'article_new':
      return FileText;
    case 'welcome':
      return BookOpen;
    default:
      return Bell;
  }
}

export function RecentNotifications({ notifications }: { notifications: NotificationEntry[] }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-text">
          <Bell size={17} className="text-primary" />
          اعلان‌های اخیر
        </h2>
        <Link href="/panel/notifications" className="inline-flex items-center gap-1 text-xs text-primary transition hover:underline">
          مشاهده همه
          <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      {notifications.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">اعلانی وجود ندارد.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((notification, index) => {
            const Icon = typeIcon(notification.type);
            const inner = (
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${notification.read_at ? 'text-text-muted' : 'font-semibold text-text'}`}>
                      {notification.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-text-subtle">{notification.body}</p>
                  </div>
                </div>
                <StatusBadge variant="neutral" dot={DOT_CYCLE[index % DOT_CYCLE.length]}>
                  {formatRelativeTimeFa(notification.created_at)}
                </StatusBadge>
              </div>
            );

            return (
              <li key={notification.id}>
                {notification.link ? (
                  <Link
                    href={notification.link}
                    className="block rounded-xl border border-border/60 bg-surface-soft p-3 transition-all duration-300 hover:border-primary/30"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-surface-soft p-3 transition-all duration-300 hover:border-primary/30">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
