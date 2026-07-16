import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { AdminPage } from '../../ui';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';

export default async function TelegramBroadcastsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.broadcast.create')) {
    redirect('/admin/telegram');
  }

  return (
    <AdminPage>
      <AdminPageHeader title="پیام‌های همگانی" description="پیش‌نویس، تست، تأیید و صف ارسال" />
      <AdminContentPanel>
        <AdminListEmpty title="پیام همگانی ثبت نشده" description="از API ادمین یا فاز بعدی UI برای ایجاد Broadcast استفاده کنید." />
      </AdminContentPanel>
    </AdminPage>
  );
}
