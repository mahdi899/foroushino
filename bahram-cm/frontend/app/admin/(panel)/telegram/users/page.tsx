import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { TelegramSubPage } from '../TelegramSubPage';

export default async function TelegramUsersPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.users.view')) {
    redirect('/admin/telegram');
  }

  return (
    <TelegramSubPage
      title="کاربران تلگرام"
      description="حساب‌های متصل به ربات آکادمی"
      icon="Users"
      empty={{
        icon: 'Users',
        title: 'هنوز کاربری متصل نشده',
        description: 'پس از ثبت‌نام کاربران در ربات، لیست اینجا نمایش داده می‌شود.',
      }}
    />
  );
}
