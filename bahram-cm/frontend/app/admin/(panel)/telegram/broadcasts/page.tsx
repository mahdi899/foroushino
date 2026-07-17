import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramBots, loadTelegramBroadcastSegments, loadTelegramBroadcasts } from '@/lib/admin/telegram';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramBroadcastsClient } from './TelegramBroadcastsClient';

export const dynamic = 'force-dynamic';

export default async function TelegramBroadcastsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.broadcast.create')) {
    redirect('/admin/telegram');
  }

  const bots = await loadTelegramBots();
  const botKey = bots[0]?.key;
  const [{ items, meta }, segments] = await Promise.all([
    loadTelegramBroadcasts({ per_page: 50 }),
    loadTelegramBroadcastSegments(botKey),
  ]);

  return (
    <TelegramSubPage
      title="پیام‌های همگانی"
      description="پیش‌نویس، انتخاب گروه مخاطب، تأیید و صف ارسال"
      icon="Megaphone"
    >
      <TelegramBroadcastsClient items={items} meta={meta} bots={bots} segments={segments} />
    </TelegramSubPage>
  );
}
