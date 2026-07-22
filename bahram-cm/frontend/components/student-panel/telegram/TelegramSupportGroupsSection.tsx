import Link from 'next/link';
import { AlertCircle, CheckCircle2, ExternalLink, Send, Users } from 'lucide-react';
import { CopyTextButton } from '@/components/student-panel/ui/CopyTextButton';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';
import type { StudentTelegramDestinationsPayload } from '@/lib/student/telegramDestinations';

export function TelegramSupportGroupsSection({
  data,
  compact = false,
}: {
  data: StudentTelegramDestinationsPayload | null;
  compact?: boolean;
}) {
  if (!data || data.destinations.length === 0) {
    return null;
  }

  return (
    <section className="card panel-telegram-groups p-5 text-right sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="panel-telegram-groups__icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#229ED9]/10 text-[#229ED9]">
          <Users size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-text">گروه‌های پشتیبانی تلگرام</h2>
          <p className="panel-section-subtitle mt-1">
            {compact
              ? 'برای پرسش درباره دوره‌های خریداری‌شده به گروه اختصاصی بپیوندید.'
              : 'با عضویت در گروه پشتیبانی دوره، سوالات آموزشی خود را مستقیم از تیم پشتیبانی بپرسید.'}
          </p>
        </div>
      </div>

      {!data.telegram_linked ? (
        <div className="panel-telegram-groups__notice mb-4 flex gap-2 rounded-xl border border-warning/25 bg-warning/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="panel-text-meta leading-relaxed text-text-muted">
            <p>برای تأیید عضویت، ابتدا اکانت تلگرام خود را در ربات دوره لینک کنید.</p>
            {data.telegram_bot_url ? (
              <a
                href={data.telegram_bot_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <Send size={14} />
                ورود به ربات تلگرام
                <ExternalLink size={12} />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <ul className="panel-telegram-groups__list flex flex-col gap-3">
        {data.destinations.map((destination) => (
          <li
            key={destination.id}
            className="rounded-xl border border-border/70 bg-surface-soft/50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-text">{destination.title}</h3>
                {destination.product_titles.length > 0 ? (
                  <p className="panel-text-meta mt-1 text-text-muted">
                    دوره: {destination.product_titles.join('، ')}
                  </p>
                ) : null}
              </div>
              <StatusBadge variant={destination.status === 'member' ? 'success' : 'neutral'}>
                {destination.status === 'member' ? 'عضو هستید' : 'در انتظار عضویت'}
              </StatusBadge>
            </div>

            {destination.status === 'member' ? (
              <p className="panel-text-meta mt-3 flex items-center gap-1.5 text-success">
                <CheckCircle2 size={14} />
                شما در این گروه عضو هستید.
              </p>
            ) : destination.invite_url ? (
              <div className="mt-3 flex flex-col gap-2">
                <p className="panel-text-meta text-text-muted">
                  {destination.mode === 'per_user'
                    ? 'لینک اختصاصی شما — بعد از عضویت موفق، لینک غیرفعال می‌شود.'
                    : 'لینک عضویت — فقط درخواست اکانت لینک‌شده شما تأیید می‌شود.'}
                </p>
                {!compact ? (
                  <CopyTextButton value={destination.invite_url} label="کپی لینک" showValue={false} />
                ) : null}
                <a
                  href={destination.invite_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full sm:w-auto"
                >
                  <Send size={16} />
                  درخواست عضویت در تلگرام
                </a>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {data.telegram_linked && data.telegram_bot_url ? (
        <p className="panel-text-meta mt-4 text-text-muted">
          می‌توانید لینک‌ها را از{' '}
          <Link href="/panel/courses" className="font-medium text-primary hover:underline">
            صفحه دوره‌ها
          </Link>{' '}
          یا ربات تلگرام هم دریافت کنید.
        </p>
      ) : null}
    </section>
  );
}
