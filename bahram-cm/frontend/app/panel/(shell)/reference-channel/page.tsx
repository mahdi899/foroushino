import type { Metadata } from 'next';
import Link from 'next/link';
import { Radio, ShieldCheck, ExternalLink, ShoppingCart } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { PanelTomanAmount } from '@/components/student-panel/ui/PanelTomanAmount';
import { panelStudentFetch } from '@/lib/student/panelServer';
import { sanitizeRichHtml } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'کانال مرجع | پنل کاربری', robots: { index: false, follow: false } };

interface ReferenceChannelListItem {
  id: number;
  slug: string;
  title: string;
  product_slug: string | null;
  identity_ready: boolean;
  verification_level: number;
  bot_start_url: string | null;
  source: string | null;
}

interface ReferenceChannelOffer {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  product_slug: string | null;
  purchase_path: string;
  amount: number;
  final_amount: number;
  seminar_discount: number;
  seminar_off: boolean;
}

export default async function PanelReferenceChannelsPage() {
  const { data: channels } = await panelStudentFetch<{ data: ReferenceChannelListItem[] }>(
    '/reference-channels',
  );

  let offers: ReferenceChannelOffer[] = [];
  try {
    const offerRes = await panelStudentFetch<{ data: ReferenceChannelOffer[] }>(
      '/reference-channels/offer',
    );
    offers = offerRes.data ?? [];
  } catch (error) {
    // Never swallow Next.js login redirects from panelStudentFetch.
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      String((error as { digest?: string }).digest ?? '').startsWith('NEXT_REDIRECT')
    ) {
      throw error;
    }
  }

  return (
    <div className="panel-page-inner flex flex-col gap-5">
      <PanelPageHeader
        icon={Radio}
        title="کانال مرجع"
        description="خرید دسترسی به گروه مرجع، یا مدیریت عضویت پس از خرید"
      />

      {offers.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-text">خرید کانال مرجع</h2>
          {offers.map((offer) => (
            <article key={offer.id} className="card flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-text">{offer.title}</h3>
                  {offer.description ? (
                    <div
                      className="mt-2 text-sm leading-relaxed text-text-muted [&_p]:mb-2 [&_p:last-child]:mb-0"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(offer.description) }}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-text-muted">
                      دسترسی به گروه اختصاصی منابع آکادمی پس از خرید و احراز هویت.
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-start sm:text-end">
                  {offer.seminar_off ? (
                    <div className="flex flex-col gap-1 sm:items-end">
                      <span className="text-caption text-text-muted line-through">
                        <PanelTomanAmount amount={offer.amount} size="sm" />
                      </span>
                      <PanelTomanAmount amount={offer.final_amount} />
                      <span className="text-caption text-emerald">ویژه شرکت‌کنندگان سمینار</span>
                    </div>
                  ) : (
                    <PanelTomanAmount amount={offer.final_amount} />
                  )}
                </div>
              </div>
              <div>
                <Link href={offer.purchase_path} className="btn btn-primary">
                  <ShoppingCart size={16} />
                  خرید و فعال‌سازی
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {channels.length === 0 && offers.length === 0 ? (
        <div className="panel-empty-state card flex flex-col items-center gap-3 p-10 text-center">
          <Radio size={32} className="text-text-muted" />
          <p className="text-sm text-text-muted">
            فعلاً کانال مرجعی برای خرید یا دسترسی شما فعال نیست. اگر اخیراً خرید کرده‌اید، چند لحظه بعد صفحه را
            تازه کنید.
          </p>
        </div>
      ) : null}

      {channels.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-text">دسترسی‌های فعال شما</h2>
          {channels.map((channel) => (
            <article
              key={channel.id}
              className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="text-base font-semibold text-text">{channel.title}</h3>
                <p className="mt-1 text-sm text-text-muted">
                  {channel.identity_ready
                    ? 'هویت شما تأیید شده است. برای عضویت در گروه مرجع، ربات را با لینک سریع استارت کنید.'
                    : 'پس از خرید، ابتدا احراز هویت را کامل کنید؛ پس از تأیید کارشناس، لینک عضویت ربات فعال می‌شود.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!channel.identity_ready ? (
                  <Link href="/panel/identity-verification" className="btn btn-primary">
                    <ShieldCheck size={16} />
                    احراز هویت
                  </Link>
                ) : channel.bot_start_url ? (
                  <a href={channel.bot_start_url} target="_blank" rel="noreferrer" className="btn btn-primary">
                    <ExternalLink size={16} />
                    عضویت از طریق ربات
                  </a>
                ) : null}
                <Link href={`/panel/reference-channel/${channel.id}`} className="btn btn-ghost">
                  جزئیات
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
