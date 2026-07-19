import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramBotProfile, loadTelegramBots, loadTelegramInfrastructure } from '@/lib/admin/telegram';
import { loadTelegramWorkerSample } from '@/lib/admin/telegram-worker-sample';
import type { TelegramBotProfileView, TelegramInfrastructureView } from '@/lib/admin/telegram.types';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramSettingsClient } from './TelegramSettingsClient';

export const dynamic = 'force-dynamic';

export default async function TelegramSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.settings.manage')) {
    redirect('/admin/telegram');
  }

  const bots = await loadTelegramBots();
  const infrastructure = await loadTelegramInfrastructure();
  const workerSample = await loadTelegramWorkerSample();
  const profilesEntries = await Promise.all(
    bots.map(async (bot) => {
      const profile = await loadTelegramBotProfile(bot.id);
      return [
        bot.id,
        profile ?? {
          name: bot.display_name,
          description: null,
          short_description: null,
          username: bot.username,
        },
      ] as const;
    }),
  );
  const profiles = Object.fromEntries(profilesEntries) as Record<number, TelegramBotProfileView>;

  return (
    <TelegramSubPage
      title="تنظیمات ربات"
      description="مدیریت ربات‌ها، وب‌هوک، پروفایل تلگرام و گروه گزارشات از پنل"
      icon="Settings"
    >
      <TelegramSettingsClient bots={bots} profiles={profiles} infrastructure={infrastructure} workerSample={infrastructure?.worker_sample_template ?? workerSample} />
    </TelegramSubPage>
  );
}
