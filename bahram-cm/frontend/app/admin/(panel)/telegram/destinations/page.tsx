import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramBots, loadTelegramDestinations } from '@/lib/admin/telegram';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramDestinationsClient } from './TelegramDestinationsClient';

export const dynamic = 'force-dynamic';

export default async function TelegramDestinationsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.destinations.manage')) {
    redirect('/admin/telegram');
  }

  const [items, bots] = await Promise.all([loadTelegramDestinations(), loadTelegramBots()]);

  return (
    <TelegramSubPage
      title="مقاصد تلگرامی"
      description="کانال‌ها و گروه‌های وابسته به محصول و KYC"
      icon="MapPin"
    >
      <TelegramDestinationsClient items={items} bots={bots} />
    </TelegramSubPage>
  );
}
