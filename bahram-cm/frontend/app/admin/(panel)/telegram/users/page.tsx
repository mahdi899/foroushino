import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { AdminPage } from '../../ui';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';

export default async function TelegramUsersPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.users.view')) {
    redirect('/admin/telegram');
  }

  return (
    <AdminPage>
      <AdminPageHeader title="کاربران تلگرام" description="حساب‌های متصل به ربات آکادمی" />
      <AdminContentPanel>
        <AdminListEmpty title="هنوز کاربری متصل نشده" description="پس از ثبت‌نام کاربران در ربات، لیست اینجا نمایش داده می‌شود." />
      </AdminContentPanel>
    </AdminPage>
  );
}
