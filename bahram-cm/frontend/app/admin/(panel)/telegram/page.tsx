import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramHealth } from '@/lib/admin/telegram';
import { AdminPage } from '../ui';
import { TelegramHubClient } from './TelegramHubClient';

export const dynamic = 'force-dynamic';

export default async function TelegramAdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.view')) {
    redirect('/admin');
  }

  const health = await loadTelegramHealth();

  return (
    <AdminPage
      title="ربات تلگرام آکادمی"
      desc="مدیریت ربات دانشجویی، وب‌هوک، پشتیبانی و پیام‌های همگانی"
      icon="Send"
      headerVariant="telegram"
    >
      <TelegramHubClient
        health={health}
        permissions={user.permissions}
        isSuperAdmin={Boolean(user.is_super_admin)}
      />
    </AdminPage>
  );
}
