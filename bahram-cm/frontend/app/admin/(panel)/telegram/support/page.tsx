import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramOperators, loadTelegramSupportCategories } from '@/lib/admin/telegram';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramSupportClient } from './TelegramSupportClient';

export const dynamic = 'force-dynamic';

export default async function TelegramSupportPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.support.manage')) {
    redirect('/admin/telegram');
  }

  const [categories, operators] = await Promise.all([loadTelegramSupportCategories(), loadTelegramOperators()]);

  return (
    <TelegramSubPage
      title="پشتیبانی تلگرام"
      description="دسته‌ها، Topicها و اپراتورها"
      icon="Headphones"
    >
      <TelegramSupportClient categories={categories} operators={operators} />
    </TelegramSubPage>
  );
}
