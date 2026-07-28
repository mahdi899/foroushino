import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { getReferenceChannel, getReferenceDestinationOptions } from '@/lib/admin/academyData';
import { loadTelegramMessages } from '@/lib/admin/telegram';
import { ReferenceChannelSettingsPanel } from '../ReferenceChannelSettingsPanel';
import { ReferenceChannelContentPanel } from '../ReferenceChannelContentPanel';
import { ReferenceChannelEntitlementsPanel } from '../ReferenceChannelEntitlementsPanel';

export const dynamic = 'force-dynamic';

export default async function ReferenceChannelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [channel, { items: destinations }, messages] = await Promise.all([
    getReferenceChannel(Number(id)),
    getReferenceDestinationOptions(),
    loadTelegramMessages('production'),
  ]);
  if (!channel) notFound();

  return (
    <AdminPage title={channel.title} desc="تنظیمات، برگه نمایش ربات و دسترسی‌ها" backHref="/admin/academy/reference-channels">
      <div className="space-y-6">
        <ReferenceChannelContentPanel channel={channel} initialMessages={messages} />
        <ReferenceChannelSettingsPanel channel={channel} destinations={destinations} />
        <ReferenceChannelEntitlementsPanel channel={channel} />
      </div>
    </AdminPage>
  );
}
