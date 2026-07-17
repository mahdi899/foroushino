import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramDeliveryLogs, loadTelegramUpdates } from '@/lib/admin/telegram';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramLogsClient } from './TelegramLogsClient';

export const dynamic = 'force-dynamic';

export default async function TelegramLogsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.logs.view')) {
    redirect('/admin/telegram');
  }

  const [{ items: updates, meta: updatesMeta }, { items: deliveryLogs, meta: deliveryMeta }] = await Promise.all([
    loadTelegramUpdates({ per_page: 50 }),
    loadTelegramDeliveryLogs({ per_page: 50 }),
  ]);

  return (
    <TelegramSubPage
      title="لاگ‌های ربات"
      description="آپدیت‌های ناموفق و delivery log"
      icon="ScrollText"
    >
      <TelegramLogsClient
        updates={updates}
        updatesMeta={updatesMeta}
        deliveryLogs={deliveryLogs}
        deliveryMeta={deliveryMeta}
      />
    </TelegramSubPage>
  );
}
