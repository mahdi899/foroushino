import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { TelegramSubPage } from '../TelegramSubPage';

export default async function TelegramRequiredChatsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.required_chats.manage')) {
    redirect('/admin/telegram');
  }

  return (
    <TelegramSubPage
      title="کانال‌های اجباری"
      description="کانال‌هایی که عضویت در آن‌ها برای استفاده از ربات الزامی است"
      icon="Radio"
      empty={{
        icon: 'Radio',
        title: 'کانالی ثبت نشده',
        description: 'از پنل یا seeder کانال‌های اجباری را اضافه کنید.',
      }}
    />
  );
}
