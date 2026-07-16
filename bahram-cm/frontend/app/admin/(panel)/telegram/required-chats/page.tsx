import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { AdminPage } from '../../ui';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';

export default async function TelegramRequiredChatsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.required_chats.manage')) {
    redirect('/admin/telegram');
  }

  return (
    <AdminPage>
      <AdminPageHeader title="کانال‌های اجباری" description="کانال‌هایی که عضویت در آن‌ها برای استفاده از ربات الزامی است" />
      <AdminContentPanel>
        <AdminListEmpty title="کانالی ثبت نشده" description="از پنل یا seeder کانال‌های اجباری را اضافه کنید." />
      </AdminContentPanel>
    </AdminPage>
  );
}
