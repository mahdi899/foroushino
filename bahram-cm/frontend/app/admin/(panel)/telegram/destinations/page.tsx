import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramBots, loadTelegramDestinations } from '@/lib/admin/telegram';
import { getProducts } from '@/lib/admin/commerceData';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramDestinationsClient } from './TelegramDestinationsClient';

export const dynamic = 'force-dynamic';

export default async function TelegramDestinationsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.destinations.manage')) {
    redirect('/admin/telegram');
  }

  const [items, bots, productsResult] = await Promise.all([
    loadTelegramDestinations(),
    loadTelegramBots(),
    getProducts(),
  ]);

  return (
    <TelegramSubPage
      title="مقاصد تلگرامی"
      description="گروه‌های پشتیبانی اختصاصی هر محصول — لینک عضویت شخصی‌سازی‌شده برای خریداران"
      icon="MapPin"
    >
      <TelegramDestinationsClient items={items} bots={bots} products={productsResult.items} />
    </TelegramSubPage>
  );
}
