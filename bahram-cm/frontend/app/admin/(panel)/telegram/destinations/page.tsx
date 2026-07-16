import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { AdminPage } from '../../ui';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';

export default async function TelegramDestinationsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.destinations.manage')) {
    redirect('/admin/telegram');
  }

  return (
    <AdminPage>
      <AdminPageHeader title="مقاصد تلگرامی" description="کانال‌ها و گروه‌های وابسته به محصول و KYC" />
      <AdminContentPanel>
        <AdminListEmpty title="مقصدی ثبت نشده" description="مقاصد join-request را از API ادمین تعریف کنید." />
      </AdminContentPanel>
    </AdminPage>
  );
}
