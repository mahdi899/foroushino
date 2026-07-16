import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { AdminPage } from '../../ui';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';

export default async function TelegramLogsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.logs.view')) {
    redirect('/admin/telegram');
  }

  return (
    <AdminPage>
      <AdminPageHeader title="لاگ‌های ربات" description="آپدیت‌های ناموفق و delivery log" />
      <AdminContentPanel>
        <AdminListEmpty title="لاگی برای نمایش نیست" description="لاگ‌ها در storage/logs/telegram.log و جداول updates/delivery ذخیره می‌شوند." />
      </AdminContentPanel>
    </AdminPage>
  );
}
