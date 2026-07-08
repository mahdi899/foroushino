import Link from 'next/link';
import { MessageCircle, Send } from 'lucide-react';

const CHANNELS = [
  {
    title: 'واتساپ پشتیبانی',
    desc: 'پاسخگویی سریع در واتساپ',
    hours: 'همه روزه ۹ تا ۲۱',
    href: 'https://wa.me/',
    icon: MessageCircle,
    iconWrap: 'bg-green-500/10 text-green-500',
    badge: 'bg-green-500/10 text-green-500',
    btn: 'border-green-500/20 text-green-500 hover:bg-green-500/5 hover:border-green-500/40',
    glow: 'bg-green-500/5 group-hover:bg-green-500/10',
    cardHover: 'hover:border-green-500/30',
    cta: 'واتساپ',
  },
  {
    title: 'تلگرام پشتیبانی',
    desc: 'پشتیبانی از طریق تلگرام',
    hours: 'همه روزه ۹ تا ۲۱',
    href: 'https://t.me/',
    icon: Send,
    iconWrap: 'bg-primary/10 text-primary',
    badge: 'bg-primary/10 text-primary',
    btn: 'border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40',
    glow: 'bg-primary/5 group-hover:bg-primary/10',
    cardHover: 'hover:border-primary/30',
    cta: 'تلگرام',
  },
] as const;

export function QuickContactCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {CHANNELS.map((channel) => (
        <div
          key={channel.title}
          className={`card group relative flex flex-col justify-between overflow-hidden p-5 transition-all duration-300 hover:scale-[1.01] ${channel.cardHover}`}
        >
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${channel.iconWrap}`}>
                <channel.icon size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">{channel.title}</h3>
                <p className="mt-1 text-[10px] text-text-muted">{channel.desc}</p>
              </div>
            </div>
            <span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${channel.badge}`}>{channel.hours}</span>
          </div>
          <a
            href={channel.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-secondary mt-5 w-full py-2 text-xs ${channel.btn}`}
          >
            <channel.icon size={14} />
            تماس از {channel.cta}
          </a>
          <div className={`absolute -bottom-10 -left-10 h-28 w-28 rounded-full blur-2xl transition-colors ${channel.glow}`} />
        </div>
      ))}
    </div>
  );
}

export function TicketHistoryTable({
  tickets,
  formatDate,
  statusLabels,
  statusBadges,
}: {
  tickets: { id: number; subject: string; status: string; created_at: string | null }[];
  formatDate: (d: string | null) => string;
  statusLabels: Record<string, string>;
  statusBadges: Record<string, string>;
}) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-xs text-text-muted">هنوز تیکتی ثبت نکرده‌اید.</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="panel-table">
          <thead>
            <tr>
              <th>شناسه تیکت</th>
              <th>موضوع</th>
              <th>آخرین بروزرسانی</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="group cursor-pointer">
                <td className="text-xs font-semibold text-text-muted">
                  <Link href={`/panel/support/${ticket.id}`} className="block">
                    #TK-{ticket.id}
                  </Link>
                </td>
                <td className="text-xs font-bold text-text transition-colors group-hover:text-primary">
                  <Link href={`/panel/support/${ticket.id}`} className="block">
                    {ticket.subject}
                  </Link>
                </td>
                <td className="text-xs text-text-muted">
                  <Link href={`/panel/support/${ticket.id}`} className="block">
                    {formatDate(ticket.created_at)}
                  </Link>
                </td>
                <td>
                  <Link href={`/panel/support/${ticket.id}`} className="block">
                    <span className={`badge ${statusBadges[ticket.status] ?? 'badge-neutral'}`}>
                      {statusLabels[ticket.status] ?? ticket.status}
                    </span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 p-4 md:hidden">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/panel/support/${ticket.id}`}
            className="block rounded-xl border border-border bg-surface-soft p-3 transition-all duration-300 hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text">{ticket.subject}</p>
                <p className="mt-1 text-xs text-text-muted">
                  #TK-{ticket.id} · {formatDate(ticket.created_at)}
                </p>
              </div>
              <span className={`badge shrink-0 ${statusBadges[ticket.status] ?? 'badge-neutral'}`}>
                {statusLabels[ticket.status] ?? ticket.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
