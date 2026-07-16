import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { TelegramSubPage } from '../TelegramSubPage';

export default async function TelegramDestinationsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.destinations.manage')) {
    redirect('/admin/telegram');
  }

  return (
    <TelegramSubPage
      title="مقاصد تلگرامی"
      description="کانال‌ها و گروه‌های وابسته به محصول و KYC"
      icon="MapPin"
      empty={{
        icon: 'MapPin',
        title: 'مقصدی ثبت نشده',
        description: 'مقاصد join-request را از API ادمین تعریف کنید.',
      }}
    />
  );
}
