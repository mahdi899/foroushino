import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramBots, loadTelegramBroadcasts } from '@/lib/admin/telegram';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramBroadcastsClient } from './TelegramBroadcastsClient';

export const dynamic = 'force-dynamic';

export default async function TelegramBroadcastsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.broadcast.create')) {
    redirect('/admin/telegram');
  }

  const [{ items, meta }, bots] = await Promise.all([loadTelegramBroadcasts({ per_page: 50 }), loadTelegramBots()]);

  return (
    <TelegramSubPage
      title="پیام‌های همگانی"
      description="پیش‌نویس، تست، تأیید و صف ارسال"
      icon="Megaphone"
    >
      <TelegramBroadcastsClient items={items} meta={meta} bots={bots} />
    </TelegramSubPage>
  );
}
