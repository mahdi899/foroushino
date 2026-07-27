import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { getReferenceChannel, getReferenceDestinationOptions } from '@/lib/admin/academyData';
import { ReferenceChannelSettingsPanel } from '../ReferenceChannelSettingsPanel';
import { ReferenceChannelEntitlementsPanel } from '../ReferenceChannelEntitlementsPanel';

export const dynamic = 'force-dynamic';

export default async function ReferenceChannelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [channel, { items: destinations }] = await Promise.all([
    getReferenceChannel(Number(id)),
    getReferenceDestinationOptions(),
  ]);
  if (!channel) notFound();

  return (
    <AdminPage title={channel.title} desc="تنظیمات و دسترسی‌های کانال مرجع" backHref="/admin/academy/reference-channels">
      <div className="space-y-6">
        <ReferenceChannelSettingsPanel channel={channel} destinations={destinations} />
        <ReferenceChannelEntitlementsPanel channel={channel} />
      </div>
    </AdminPage>
  );
}
