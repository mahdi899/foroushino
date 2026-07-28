import type { Metadata } from 'next';
import { Radio } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import {
  ReferenceChannelShowcase,
  type ReferenceChannelCardModel,
  type SeminarBadge,
} from '@/components/student-panel/reference-channel/ReferenceChannelShowcase';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'کانال مرجع | پنل کاربری', robots: { index: false, follow: false } };

interface ReferenceChannelListItem extends ReferenceChannelCardModel {
  product_slug: string | null;
  verification_level: number;
  source: string | null;
}

interface ReferenceChannelOffer extends ReferenceChannelCardModel {
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
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      String((error as { digest?: string }).digest ?? '').startsWith('NEXT_REDIRECT')
    ) {
      throw error;
    }
  }

  const seminarBadges: SeminarBadge[] =
    channels.find((c) => (c.seminar_badges?.length ?? 0) > 0)?.seminar_badges ??
    offers.find((o) => (o.seminar_badges?.length ?? 0) > 0)?.seminar_badges ??
    [];

  return (
    <div className="panel-page-inner panel-page-inner--rc flex flex-col gap-6">
      <PanelPageHeader
        icon={Radio}
        title="کانال مرجع"
        description="خرید دسترسی به گروه مرجع، یا مدیریت عضویت پس از خرید"
      />

      {offers.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-text">خرید کانال مرجع</h2>
            <p className="text-sm text-text-muted">عنوان، توضیحات و قیمت ویژه شما در یک نمای واحد.</p>
          </div>
          {offers.map((offer) => (
            <ReferenceChannelShowcase key={offer.id} channel={{ ...offer, owned: false }} />
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
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-text">دسترسی‌های فعال شما</h2>
            <p className="text-sm text-text-muted">وضعیت عضویت و مسیر ورود به گروه مرجع.</p>
          </div>
          {channels.map((channel) => (
            <ReferenceChannelShowcase
              key={channel.id}
              channel={{
                ...channel,
                owned: true,
                seminar_badges: channel.seminar_badges?.length ? channel.seminar_badges : seminarBadges,
              }}
              detailHref={`/panel/reference-channel/${channel.id}`}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
