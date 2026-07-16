import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { AdminPage } from '../../ui';
import { AdminPageHeader } from '@/components/admin/layout/AdminPageHeader';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';

export default async function TelegramSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.settings.manage')) {
    redirect('/admin/telegram');
  }

  return (
    <AdminPage>
      <AdminPageHeader title="تنظیمات ربات" description="توکن واقعی در پنل نمایش داده نمی‌شود؛ فقط از env خوانده می‌شود." />
      <AdminContentPanel>
        <p className="text-sm opacity-80">
          متغیرهای <code>TELEGRAM_BOT_TOKEN</code>، <code>TELEGRAM_WEBHOOK_SECRET</code> و معادل Staging را در سرور تنظیم کنید.
          سپس <code>php artisan telegram:sync-bots</code> و <code>php artisan telegram:webhook:set</code> را اجرا کنید.
        </p>
      </AdminContentPanel>
    </AdminPage>
  );
}
