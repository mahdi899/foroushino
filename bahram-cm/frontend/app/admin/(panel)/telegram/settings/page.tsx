import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramCodeList, TelegramInfoPanel } from '../TelegramInfoPanel';

export default async function TelegramSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.settings.manage')) {
    redirect('/admin/telegram');
  }

  return (
    <TelegramSubPage
      title="تنظیمات ربات"
      description="توکن واقعی در پنل نمایش داده نمی‌شود؛ فقط از env خوانده می‌شود."
      icon="Settings"
    >
      <div className="admin-telegram-subpage__stack">
        <TelegramInfoPanel icon="Shield" tone="blue" title="متغیرهای محیطی">
          <p className="admin-telegram-info-panel__text">
            توکن و secret وب‌هوک را در سرور تنظیم کنید. مقادیر حساس هرگز در UI نمایش داده نمی‌شوند.
          </p>
          <TelegramCodeList
            items={[
              { code: 'TELEGRAM_BOT_TOKEN', hint: 'توکن ربات production' },
              { code: 'TELEGRAM_WEBHOOK_SECRET', hint: 'رمز تأیید وب‌هوک' },
              { code: 'TELEGRAM_*_STAGING', hint: 'معادل staging (در صورت نیاز)' },
            ]}
          />
        </TelegramInfoPanel>

        <TelegramInfoPanel icon="Zap" tone="teal" title="دستورات راه‌اندازی">
          <TelegramCodeList
            items={[
              { code: 'php artisan telegram:sync-bots', hint: 'همگام‌سازی ربات‌ها از env' },
              { code: 'php artisan telegram:webhook:set', hint: 'ثبت URL وب‌هوک در تلگرام' },
              { code: 'php artisan telegram:health-check', hint: 'بررسی سلامت از CLI' },
            ]}
          />
        </TelegramInfoPanel>
      </div>
    </TelegramSubPage>
  );
}
