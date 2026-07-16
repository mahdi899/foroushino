import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { TelegramSubPage } from '../TelegramSubPage';

export default async function TelegramBroadcastsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.broadcast.create')) {
    redirect('/admin/telegram');
  }

  return (
    <TelegramSubPage
      title="پیام‌های همگانی"
      description="پیش‌نویس، تست، تأیید و صف ارسال"
      icon="Megaphone"
      empty={{
        icon: 'Megaphone',
        title: 'پیام همگانی ثبت نشده',
        description: 'از API ادمین یا فاز بعدی UI برای ایجاد Broadcast استفاده کنید.',
      }}
    />
  );
}
