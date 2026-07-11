import Link from 'next/link';
import { ChevronLeft, Inbox, MessageCircle, Radio, Send } from 'lucide-react';
import { siteConfig } from '@/config/site';

const CHANNELS = [
  {
    key: 'telegram',
    title: 'تلگرام پشتیبانی',
    desc: 'تیم پشتیبانی رستمی در تلگرام',
    hours: 'همه روزه ۹ تا ۲۱',
    href: siteConfig.social.telegram,
    icon: Send,
    cta: 'تلگرام',
  },
  {
    key: 'whatsapp',
    title: 'واتساپ پشتیبانی',
    desc: 'پاسخگویی سریع در واتساپ',
    hours: 'همه روزه ۹ تا ۲۱',
    href: `https://wa.me/${siteConfig.contact.whatsappRaw}`,
    icon: MessageCircle,
    cta: 'واتساپ',
  },
  {
    key: 'rubika',
    title: 'روبیکا پشتیبانی',
    desc: 'پیام مستقیم در روبیکا',
    hours: 'همه روزه ۹ تا ۲۱',
    href: siteConfig.social.rubika,
    icon: Radio,
    cta: 'روبیکا',
  },
] as const;

export function QuickContactCards() {
  return (
    <div className="panel-quick-contact-grid">
      {CHANNELS.map((channel) => (
        <div
          key={channel.key}
          className={`panel-quick-contact-card panel-quick-contact-card--${channel.key} card group relative flex flex-col justify-between overflow-hidden p-5`}
        >
          <div className="panel-quick-contact-card__glow" aria-hidden />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className={`panel-quick-contact-card__icon panel-quick-contact-card__icon--${channel.key}`}>
                <channel.icon size={22} strokeWidth={2} />
              </span>
              <div>
                <h3 className="panel-card-title">{channel.title}</h3>
                <p className="panel-text-caption mt-1 text-text-muted">{channel.desc}</p>
              </div>
            </div>
            <span className={`panel-quick-contact-card__badge panel-quick-contact-card__badge--${channel.key}`}>
              {channel.hours}
            </span>
          </div>
          <a
            href={channel.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`panel-quick-contact-card__cta panel-quick-contact-card__cta--${channel.key}`}
          >
            <channel.icon size={14} strokeWidth={2} />
            تماس از {channel.cta}
          </a>
        </div>
      ))}
    </div>
  );
}

function formatTicketDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fa-IR');
  } catch {
    return '—';
  }
}

export function TicketHistoryTable({
  tickets,
  statusLabels,
  statusBadges,
}: {
  tickets: { id: number; subject: string; status: string; created_at: string | null }[];
  statusLabels: Record<string, string>;
  statusBadges: Record<string, string>;
}) {
  if (tickets.length === 0) {
    return (
      <div className="panel-empty-state flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="panel-support-empty__icon">
          <Inbox size={22} strokeWidth={2} aria-hidden />
        </span>
        <p className="text-sm font-medium text-text">هنوز تیکتی ثبت نکرده‌اید</p>
        <p className="max-w-xs text-sm leading-relaxed text-text-muted">
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
                <span>{formatTicketDate(ticket.created_at)}</span>
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
