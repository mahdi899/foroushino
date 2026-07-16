import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { TelegramSubPage } from '../TelegramSubPage';

export default async function TelegramSupportPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.support.manage')) {
    redirect('/admin/telegram');
  }

  return (
    <TelegramSubPage
      title="پشتیبانی تلگرام"
      description="دسته‌ها، Topicها و اپراتورها"
      icon="Headphones"
      empty={{
        icon: 'Headphones',
        title: 'پیکربندی پشتیبانی',
        description: 'دسته‌های پیش‌فرض با TelegramBotSeeder ساخته می‌شوند.',
      }}
    />
  );
}
