import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Radio } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { ReferenceChannelShowcase } from '@/components/student-panel/reference-channel/ReferenceChannelShowcase';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'جزئیات کانال مرجع | پنل کاربری', robots: { index: false, follow: false } };

interface ReferenceChannelDetail {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  product_slug: string | null;
  identity_ready: boolean;
  verification_level: number;
  identity_url: string | null;
  bot_start_url: string | null;
  telegram_linked: boolean;
  invite_status: string;
  invite_url: string | null;
  destination_title: string | null;
  owned?: boolean;
}

export default async function PanelReferenceChannelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await panelStudentFetch<{ data: ReferenceChannelDetail }>(
    `/reference-channels/${id}`,
  ).catch(() => null);

  const channel = result?.data;
  if (!channel) notFound();

  return (
    <div className="panel-page-inner flex flex-col gap-5">
      <PanelPageHeader
        icon={Radio}
        title={channel.title}
        description={channel.destination_title ? `گروه: ${channel.destination_title}` : undefined}
      />

      <div className="panel-card-grid">
        <ReferenceChannelShowcase channel={{ ...channel, owned: true }} />
      </div>

      <div>
        <Link href="/panel/reference-channel" className="btn btn-ghost">
          بازگشت
        </Link>
      </div>
    </div>
  );
}
