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
      description="گروه‌های پشتیبانی اختصاصی هر محصول یا سات — لینک عضویت شخصی‌سازی‌شده برای کاربران مجاز"
      icon="MapPin"
    >
      {productsResult.error ? (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-small text-danger">
          {productsResult.error}
        </p>
      ) : null}
      {bots.length === 0 ? (
        <p className="mb-4 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-small text-text-muted">
          هیچ رباتی ثبت نشده. از بخش «ربات‌ها» ابتدا ربات را همگام‌سازی کنید.
        </p>
      ) : null}
      <TelegramDestinationsClient
        items={items}
        bots={bots}
        products={Array.isArray(productsResult.items) ? productsResult.items : []}
      />
    </TelegramSubPage>
  );
}
