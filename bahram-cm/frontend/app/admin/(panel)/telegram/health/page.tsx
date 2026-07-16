import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { AdminPage } from '../../ui';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';

export default async function TelegramHealthPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.view')) {
    redirect('/admin/telegram');
  }

  return (
    <AdminPage>
      <AdminPageHeader title="سلامت ربات" description="وضعیت وب‌هوک، صف‌ها و دسترسی کانال‌ها" />
      <AdminContentPanel>
        <p className="text-sm opacity-80">
          برای بررسی سریع: <code>php artisan telegram:health-check</code>
        </p>
      </AdminContentPanel>
    </AdminPage>
  );
}
