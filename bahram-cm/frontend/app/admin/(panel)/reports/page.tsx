import { getReports } from '@/lib/admin/data';
import { AdminPage, StatCard, Table, Badge } from '../ui';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { toFa } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const { total_events: total, leads: leadCount, consultations, conversion_rate: convRate, by_event: byEvent, by_source: bySource } =
    await getReports();

  return (
    <AdminPage
      icon="BarChart3"
      headerVariant="seo"
      title="گزارش‌ها و تحلیل"
      desc="مرور تبدیل و رویدادهای داخلی — ترافیک کامل در Google Analytics (Cloudflare Zaraz)"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="کل رویدادها" value={toFa(total)} icon="Activity" />
        <StatCard label="سرنخ‌ها" value={toFa(leadCount)} icon="Inbox" />
        <StatCard label="مشاوره‌های کامل‌شده" value={toFa(consultations)} icon="Sparkles" />
        <StatCard label="نرخ تبدیل تقریبی" value={`${toFa(convRate)}٪`} icon="TrendingUp" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-h3 text-text">رویدادها بر اساس نوع</h2>
          {byEvent.length ? (
            <Table
              head={['رویداد', 'تعداد']}
              mobile={byEvent.map((e) => (
                <AdminTableCard
                  key={e.type}
                  title={<Badge tone="accent">{e.type}</Badge>}
                  fields={[{ label: 'تعداد', value: toFa(e.count) }]}
                />
              ))}
            >
              {byEvent.map((e) => (
                <tr key={e.type}>
                  <td className="px-4 py-3"><Badge tone="accent">{e.type}</Badge></td>
                  <td className="px-4 py-3 font-semibold text-text">{toFa(e.count)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyNote />
          )}
        </div>
        <div>
          <h2 className="mb-3 text-h3 text-text">سرنخ‌ها بر اساس منبع</h2>
          {bySource.length ? (
            <Table
              head={['منبع', 'تعداد']}
              mobile={bySource.map((s) => (
                <AdminTableCard
                  key={s.source}
                  title={s.source}
                  fields={[{ label: 'تعداد', value: toFa(s.count) }]}
                />
              ))}
            >
              {bySource.map((s) => (
                <tr key={s.source}>
                  <td className="px-4 py-3 text-text">{s.source}</td>
                  <td className="px-4 py-3 font-semibold text-text">{toFa(s.count)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyNote />
          )}
        </div>
      </div>
    </AdminPage>
  );
}

function EmptyNote() {
  return (
    <div className="card p-8 text-center text-small text-text-muted">
      پس از اتصال MySQL و جمع‌آوری ترافیک، داده‌های تحلیلی اینجا نمایش داده می‌شوند.
    </div>
  );
}
