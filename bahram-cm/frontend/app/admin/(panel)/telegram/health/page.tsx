import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramHealth } from '@/lib/admin/telegram';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramHealthPanel } from '../TelegramHealthPanel';

export const dynamic = 'force-dynamic';

export default async function TelegramHealthPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.view')) {
    redirect('/admin/telegram');
  }

  const health = await loadTelegramHealth();

  return (
    <TelegramSubPage
      title="سلامت ربات"
      description="وضعیت وب‌هوک، صف‌ها و دسترسی کانال‌ها"
      icon="Activity"
    >
      <TelegramHealthPanel health={health} />
    </TelegramSubPage>
  );
}
