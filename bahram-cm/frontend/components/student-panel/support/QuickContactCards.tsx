import Link from 'next/link';
import { ChevronLeft, Inbox, MessageCircle, Send } from 'lucide-react';

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
      <div className="panel-empty-state flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="panel-support-empty__icon">
          <Inbox size={22} aria-hidden />
        </span>
        <p className="text-sm font-medium text-text">هنوز تیکتی ثبت نکرده‌اید</p>
        <p className="max-w-xs text-xs leading-relaxed text-text-muted">
          فرم بالا را پر کنید تا تیم پشتیبانی در اسرع وقت پاسخ دهد.
        </p>
      </div>
    );
  }

  return (
    <ul className="panel-ticket-list">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <Link href={`/panel/support/${ticket.id}`} className="panel-ticket-row">
            <div className="panel-ticket-row__main">
              <p className="panel-ticket-row__subject">{ticket.subject}</p>
              <p className="panel-ticket-row__meta">
                <span>#TK-{ticket.id}</span>
                <span aria-hidden>·</span>
                <span>{formatDate(ticket.created_at)}</span>
              </p>
            </div>
            <div className="panel-ticket-row__trail">
              <span className={`badge ${statusBadges[ticket.status] ?? 'badge-neutral'}`}>
                {statusLabels[ticket.status] ?? ticket.status}
              </span>
              <ChevronLeft size={14} className="text-text-muted" aria-hidden />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
