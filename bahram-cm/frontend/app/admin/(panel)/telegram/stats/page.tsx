import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/lib/auth/session';
import { loadTelegramBots, loadTelegramStats } from '@/lib/admin/telegram';
import { TelegramSubPage } from '../TelegramSubPage';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { toFa } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TelegramStatsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'telegram.reports.view')) {
    redirect('/admin/telegram');
  }

  const bots = await loadTelegramBots();
  const stats = await loadTelegramStats(bots[0]?.key);

  const cards = stats
    ? [
        { title: 'امروز', data: stats.day },
        { title: '۷ روز', data: stats.week },
        { title: '۳۰ روز', data: stats.month },
      ]
    : [];

  return (
    <TelegramSubPage
      title="آمار بات"
      description="کاربران یکتا، کاربران جدید و حجم آپدیت‌ها"
      icon="BarChart3"
    >
      {!stats ? (
        <AdminContentPanel title="آمار">
          <p className="py-6 text-center text-small text-text-muted">آمار در دسترس نیست.</p>
        </AdminContentPanel>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <AdminContentPanel key={card.title} title={card.title}>
              <ul className="grid gap-2 text-small">
                <li>کاربران یکتا: <strong>{toFa(card.data.unique_users)}</strong></li>
                <li>کاربران جدید: <strong>{toFa(card.data.new_users)}</strong></li>
                <li>پیام/آپدیت: <strong>{toFa(card.data.updates_count)}</strong></li>
              </ul>
            </AdminContentPanel>
          ))}
        </div>
      )}
    </TelegramSubPage>
  );
}
