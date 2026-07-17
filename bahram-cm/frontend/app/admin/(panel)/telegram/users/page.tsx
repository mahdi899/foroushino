import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramAccounts } from '@/lib/admin/telegram';
import { TelegramSubPage } from '../TelegramSubPage';
import { TelegramUsersClient } from './TelegramUsersClient';

export const dynamic = 'force-dynamic';

export default async function TelegramUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.users.view')) {
    redirect('/admin/telegram');
  }

  const { search } = await searchParams;
  const { items, meta } = await loadTelegramAccounts({ search, per_page: 50 });

  return (
    <TelegramSubPage
      title="کاربران و ادمین‌های بات"
      description="مخاطبان ربات را ببینید، مسدود کنید، یا ادمین بات کنید تا منوی ادمین داخل ربات برایشان فعال شود"
      icon="Users"
    >
      <TelegramUsersClient items={items} meta={meta} search={search} />
    </TelegramSubPage>
  );
}
