import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramBots, loadTelegramRequiredChats } from '@/lib/admin/telegram';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramRequiredChatsClient } from './TelegramRequiredChatsClient';

export const dynamic = 'force-dynamic';

export default async function TelegramRequiredChatsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.required_chats.manage')) {
    redirect('/admin/telegram');
  }

  const [items, bots] = await Promise.all([loadTelegramRequiredChats(), loadTelegramBots()]);

  return (
    <TelegramSubPage
      title="کانال‌های اجباری"
      description="کانال‌هایی که عضویت در آن‌ها برای استفاده از ربات الزامی است"
      icon="Radio"
    >
      <TelegramRequiredChatsClient items={items} bots={bots} />
    </TelegramSubPage>
  );
}
