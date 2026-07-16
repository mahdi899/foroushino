import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { TelegramSubPage } from '../TelegramSubPage';

export default async function TelegramLogsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.logs.view')) {
    redirect('/admin/telegram');
  }

  return (
    <TelegramSubPage
      title="لاگ‌های ربات"
      description="آپدیت‌های ناموفق و delivery log"
      icon="ScrollText"
      empty={{
        icon: 'ScrollText',
        title: 'لاگی برای نمایش نیست',
        description: 'لاگ‌ها در storage/logs/telegram.log و جداول updates/delivery ذخیره می‌شوند.',
      }}
    />
  );
}
