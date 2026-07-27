import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import {
  loadTelegramDeliveryLogs,
  loadTelegramDestinationLeaveEvents,
  loadTelegramUpdates,
} from '@/lib/admin/telegram';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramLogsClient } from './TelegramLogsClient';

export const dynamic = 'force-dynamic';

export default async function TelegramLogsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.logs.view')) {
    redirect('/admin/telegram');
  }

  const [
    { items: updates, meta: updatesMeta },
    { items: deliveryLogs, meta: deliveryMeta },
    { items: leaveEvents, meta: leaveMeta },
  ] = await Promise.all([
    loadTelegramUpdates({ per_page: 50 }),
    loadTelegramDeliveryLogs({ per_page: 50 }),
    loadTelegramDestinationLeaveEvents({ per_page: 50 }),
  ]);

  return (
    <TelegramSubPage
      title="لاگ‌های ربات"
      description="آپدیت‌های ناموفق، delivery log و لفت از مقاصد"
      icon="ScrollText"
    >
      <TelegramLogsClient
        updates={updates}
        updatesMeta={updatesMeta}
        deliveryLogs={deliveryLogs}
        deliveryMeta={deliveryMeta}
        leaveEvents={leaveEvents}
        leaveMeta={leaveMeta}
      />
    </TelegramSubPage>
  );
}
