import Link from 'next/link';
import { Award, CheckCircle2, ExternalLink, Radio, ShieldCheck, ShoppingCart } from 'lucide-react';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import { PanelTomanAmount } from '@/components/student-panel/ui/PanelTomanAmount';
import { sanitizeRichHtml } from '@/lib/sanitize';

export type SeminarBadge = {
  id: number;
  title: string;
  label: string;
};

export type ReferenceChannelCardModel = {
  id: number;
  title: string;
  description?: string | null;
  cover_image?: string | null;
  seminar_badges?: SeminarBadge[];
  owned?: boolean;
  identity_ready?: boolean;
  bot_start_url?: string | null;
  invite_status?: string | null;
  invite_url?: string | null;
  purchase_path?: string;
  amount?: number;
  final_amount?: number;
  seminar_off?: boolean;
};

const FALLBACK_DESCRIPTION =
  'اینجا فضای اصلی محتوا، اطلاع‌رسانی‌ها و مسیر یادگیری جمع است. با عضویت در کانال مرجع از آپدیت‌ها و فرصت‌های ویژه جا نمی‌مانی.';

function usableDescription(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const plain = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length < 8) return null;
  const lower = plain.toLowerCase();
  if (['/start', 'start', '-', 'null', 'n/a'].includes(lower)) return null;
  return raw;
}

export function ReferenceChannelShowcase({
  channel,
  detailHref,
}: {
  channel: ReferenceChannelCardModel;
  detailHref?: string;
}) {
  const owned = Boolean(channel.owned);
  const descriptionHtml = usableDescription(channel.description);
  const badges = channel.seminar_badges ?? [];
  const isMember = channel.invite_status === 'member';

  return (
    <article className="panel-rc-card">
      <div className="panel-rc-card__media">
        {channel.cover_image ? (
          <DirectMediaImg
            src={channel.cover_image}
            alt={channel.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 720px"
          />
        ) : (
          <div className="panel-rc-card__media-fallback" aria-hidden>
            <Radio size={42} strokeWidth={1.5} />
          </div>
        )}
        <div className="panel-rc-card__media-shade" />
        <div className="panel-rc-card__media-caption">
          <p className="panel-rc-card__eyebrow">کانال مرجع آکادمی</p>
          <h3 className="panel-rc-card__title">{channel.title}</h3>
        </div>
      </div>

      <div className="panel-rc-card__body">
        {badges.length > 0 ? (
          <div className="panel-rc-card__badges">
            {badges.map((badge) => (
              <div key={badge.id} className="panel-rc-badge">
                <Award size={16} strokeWidth={2} aria-hidden />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        ) : null}

        {descriptionHtml ? (
          <div
            className="panel-rc-card__desc"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(descriptionHtml) }}
          />
        ) : (
          <p className="panel-rc-card__desc-plain">{FALLBACK_DESCRIPTION}</p>
        )}

        {!owned && typeof channel.final_amount === 'number' ? (
          <div className="panel-rc-card__price">
            {channel.seminar_off && typeof channel.amount === 'number' ? (
              <>
                <span className="panel-rc-card__price-old">
                  <PanelTomanAmount amount={channel.amount} size="sm" />
                </span>
                <PanelTomanAmount amount={channel.final_amount} />
                <span className="panel-rc-card__price-note">قیمت ویژه شرکت‌کنندگان سمینار</span>
              </>
            ) : (
              <PanelTomanAmount amount={channel.final_amount} />
            )}
          </div>
        ) : null}

        {owned && isMember ? (
          <div className="panel-rc-card__owned-note">
            <CheckCircle2 size={18} strokeWidth={2} aria-hidden />
            <span>شما عضو گروه مرجع هستید.</span>
          </div>
        ) : null}

        <div className="panel-rc-card__actions">
          {!owned && channel.purchase_path ? (
            <Link href={channel.purchase_path} className="btn btn-primary">
              <ShoppingCart size={16} />
              خرید و فعال‌سازی
            </Link>
          ) : null}

          {owned && !channel.identity_ready ? (
            <Link href="/panel/identity-verification" className="btn btn-primary">
              <ShieldCheck size={16} />
              تکمیل احراز هویت
            </Link>
          ) : null}

          {owned && channel.identity_ready && channel.bot_start_url ? (
            <a href={channel.bot_start_url} target="_blank" rel="noreferrer" className="btn btn-primary">
              <ExternalLink size={16} />
              عضویت از طریق ربات
            </a>
          ) : null}

          {owned && channel.invite_url ? (
            <a href={channel.invite_url} target="_blank" rel="noreferrer" className="btn btn-secondary">
              <ExternalLink size={16} />
              ورود به گروه مرجع
            </a>
          ) : null}

          {detailHref ? (
            <Link href={detailHref} className="btn btn-ghost">
              جزئیات
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
