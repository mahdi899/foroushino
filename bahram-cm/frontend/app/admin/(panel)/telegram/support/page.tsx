import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { AdminPage } from '../../ui';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';

export default async function TelegramSupportPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.support.manage')) {
    redirect('/admin/telegram');
  }

  return (
    <AdminPage>
      <AdminPageHeader title="پشتیبانی تلگرام" description="دسته‌ها، Topicها و اپراتورها" />
      <AdminContentPanel>
        <AdminListEmpty title="پیکربندی پشتیبانی" description="دسته‌های پیش‌فرض با TelegramBotSeeder ساخته می‌شوند." />
      </AdminContentPanel>
    </AdminPage>
  );
}
