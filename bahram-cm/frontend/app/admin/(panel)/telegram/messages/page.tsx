import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramBots, loadTelegramMessages } from '@/lib/admin/telegram';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramMessagesClient } from './TelegramMessagesClient';

export const dynamic = 'force-dynamic';

export default async function TelegramMessagesPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.content.manage')) {
    redirect('/admin/telegram');
  }

  const bots = await loadTelegramBots();
  const items = await loadTelegramMessages(bots[0]?.key);

  return (
    <TelegramSubPage
      title="پیام‌های بات"
      description="ویرایش متن‌های اصلی که بات به کاربران نشان می‌دهد"
      icon="MessageSquare"
    >
      <TelegramMessagesClient items={items} bots={bots} />
    </TelegramSubPage>
  );
}
