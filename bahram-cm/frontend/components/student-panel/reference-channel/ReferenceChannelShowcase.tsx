import Link from 'next/link';
import { ExternalLink, ShieldCheck, ShoppingCart } from 'lucide-react';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import { PanelTomanAmount } from '@/components/student-panel/ui/PanelTomanAmount';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';
import { formatSeminarDiscountCopy } from '@/lib/commerce/seminarDiscountCopy';
import { sitePhotos } from '@/lib/site-photo-paths';

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
  seminar_title?: string | null;
};

const FALLBACK_COVER = sitePhotos.mainPathReference;

function ownedStatus(channel: ReferenceChannelCardModel): {
  label: string;
  variant: 'success' | 'warning' | 'neutral';
} {
  if (!channel.identity_ready) {
    return { label: 'نیاز به احراز هویت', variant: 'warning' };
  }
  if (channel.invite_status === 'member') {
    return { label: 'عضو گروه', variant: 'success' };
  }
  if (channel.invite_url) {
    return { label: 'دسترسی فعال', variant: 'success' };
  }
  if (channel.invite_status === 'need_telegram') {
    return { label: 'اتصال به ربات', variant: 'warning' };
  }
  return { label: 'در حال آماده‌سازی', variant: 'neutral' };
}

export function ReferenceChannelShowcase({
  channel,
  detailHref,
}: {
  channel: ReferenceChannelCardModel;
  detailHref?: string;
}) {
  const owned = Boolean(channel.owned);
  const coverSrc = channel.cover_image?.trim() || FALLBACK_COVER;
  const status = owned ? ownedStatus(channel) : null;

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition hover:border-primary/30 hover:shadow-glow">
      <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-surface-soft">
        <DirectMediaImg
          src={coverSrc}
          alt={channel.title}
          fill
          className="object-cover object-[left_center] transition-transform duration-500 group-hover:scale-105 md:object-center"
          sizes="(max-width: 768px) 100vw, 480px"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <h3 className="text-sm font-bold leading-snug text-white">{channel.title}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {owned && status ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
          </div>
        ) : null}

        {!owned && typeof channel.final_amount === 'number' ? (
          <div className="flex flex-wrap items-baseline gap-2">
            {channel.seminar_off && typeof channel.amount === 'number' ? (
              <span className="panel-text-meta text-text-muted line-through opacity-70">
                <PanelTomanAmount amount={channel.amount} size="sm" />
              </span>
            ) : null}
            <PanelTomanAmount amount={channel.final_amount} />
            {channel.seminar_off ? (
              <span className="panel-text-caption font-semibold text-primary">
                {formatSeminarDiscountCopy(channel.seminar_title).ribbon}
              </span>
            ) : null}
          </div>
        ) : null}

        {!owned && channel.seminar_off ? (
          <p className="panel-text-meta text-primary">
            {formatSeminarDiscountCopy(channel.seminar_title).hint}
          </p>
        ) : null}

        {!owned && !channel.seminar_off ? (
          <p className="panel-text-meta text-text-muted">محصول آماده؛ فروش در کانال خودت</p>
        ) : null}
      </div>

      <div className="border-t border-border p-4">
        {!owned && channel.purchase_path ? (
          <Link href={channel.purchase_path} className="btn btn-primary w-full">
            <ShoppingCart size={16} />
            خرید و فعال‌سازی
          </Link>
        ) : null}

        {owned && !channel.identity_ready ? (
          <Link href="/panel/identity-verification" className="btn btn-primary w-full">
            <ShieldCheck size={16} />
            احراز هویت
          </Link>
        ) : null}

        {owned && channel.identity_ready && channel.invite_url ? (
          <a
            href={channel.invite_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary w-full"
          >
            <ExternalLink size={16} />
            ورود به گروه مرجع
          </a>
        ) : null}

        {owned &&
        channel.identity_ready &&
        !channel.invite_url &&
        channel.bot_start_url ? (
          <a
            href={channel.bot_start_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary w-full"
          >
            <ExternalLink size={16} />
            عضویت از طریق ربات
          </a>
        ) : null}

        {owned &&
        channel.identity_ready &&
        !channel.invite_url &&
        !channel.bot_start_url ? (
          <span className="panel-text-meta flex w-full items-center justify-center rounded-xl border border-border/40 bg-surface-soft px-4 py-2.5 text-center text-text-muted">
            لینک دعوت به‌زودی فعال می‌شود
          </span>
        ) : null}

        {detailHref ? (
          <Link href={detailHref} className="btn btn-ghost mt-2 w-full">
            جزئیات
          </Link>
        ) : null}
      </div>
    </article>
  );
}
