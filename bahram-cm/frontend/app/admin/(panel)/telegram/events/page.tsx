import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadSmsCenterConfig } from '@/lib/admin/smsCenter';
import { TelegramSubPage } from '../TelegramSubPage';
import { AdminTelegramEventsClient } from './AdminTelegramEventsClient';

export const dynamic = 'force-dynamic';

const DEFAULT_GLOBAL = {
  is_sms_active: false,
  primary_provider_slug: 'melipayamak',
  fallback_provider_slug: null,
  fallback_delay_seconds: 20,
  fallback_enabled: true,
  test_phone: null,
  admin_telegram_enabled: false,
  admin_telegram_chat_ids: null,
};

export default async function TelegramEventsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.settings.manage')) {
    redirect('/admin/telegram');
  }

  const config = await loadSmsCenterConfig();

  return (
    <TelegramSubPage
      title="رویدادها"
      description="اطلاع‌رسانی خودکار سفارش، پرداخت، تیکت، ثبت‌نام و... به چت(های) ادمین — از همان ربات سایت"
      icon="Bell"
    >
      <AdminTelegramEventsClient
        global={config?.global ?? DEFAULT_GLOBAL}
        events={config?.admin_telegram_events ?? []}
        categories={config?.admin_telegram_categories ?? []}
      />
    </TelegramSubPage>
  );
}
