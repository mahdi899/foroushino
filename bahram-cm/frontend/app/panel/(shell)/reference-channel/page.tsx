import type { Metadata } from 'next';
import { Radio } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import {
  ReferenceChannelShowcase,
  type ReferenceChannelCardModel,
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

  const description =
    channels.length > 0
      ? `${channels.length.toLocaleString('fa-IR')} دسترسی فعال`
      : offers.length > 0
        ? 'خرید و فعال‌سازی دسترسی'
        : 'دسترسی به گروه مرجع';

  if (channels.length === 0 && offers.length === 0) {
    return (
      <div className="panel-page-inner flex flex-col gap-6">
        <PanelPageHeader icon={Radio} title="کانال مرجع" description={description} />
        <div className="panel-empty-state card flex flex-col items-center gap-4 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Radio size={32} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">کانال مرجعی یافت نشد</h2>
            <p className="panel-card-text mt-2">فعلاً کانال مرجعی برای خرید یا دسترسی شما فعال نیست.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-page-inner flex flex-col gap-6">
      <PanelPageHeader icon={Radio} title="کانال مرجع" description={description} />

      {channels.length > 0 ? (
        <div className="panel-card-grid">
          {channels.map((channel) => (
            <ReferenceChannelShowcase
              key={channel.id}
              channel={{ ...channel, owned: true }}
            />
          ))}
        </div>
      ) : null}

      {offers.length > 0 ? (
        <div className="panel-card-grid">
          {offers.map((offer) => (
            <ReferenceChannelShowcase key={offer.id} channel={{ ...offer, owned: false }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
