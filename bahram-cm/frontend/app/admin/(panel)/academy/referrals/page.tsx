import { AdminPage, Badge, Table } from '../../ui';
import { getReferralCodes, getReferralConversions } from '@/lib/admin/academyData';
import { formatDate, formatToman } from '@/lib/admin/academyTypes';
import { ReferralStatusSelect } from './ReferralStatusSelect';

export const dynamic = 'force-dynamic';

export default async function ReferralsPage() {
  const [{ items: conversions, error: convError }, { items: codes, error: codesError }] = await Promise.all([
    getReferralConversions(),
    getReferralCodes(),
  ]);

  return (
    <AdminPage title="معرفی و کش‌بک" desc="پیگیری کدهای معرف و خریدهای موفق حاصل از معرفی">
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-h3 font-bold text-primary-dark">معرفی‌های موفق</h2>
          {convError && <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{convError}</div>}
          {conversions.length > 0 ? (
            <Table head={['معرف', 'خریدار', 'سفارش', 'مبلغ کش‌بک', 'وضعیت', 'تاریخ']}>
              {conversions.map((c) => (
                <tr key={c.id} className="hover:bg-surface-soft/40">
                  <td className="px-4 py-3">{c.referrer_name ?? '—'} <span className="text-caption text-text-muted" dir="ltr">{c.referrer_mobile}</span></td>
                  <td className="px-4 py-3">{c.buyer_name ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3" dir="ltr">{c.order_number ?? '—'}</td>
                  <td className="px-4 py-3">{formatToman(c.cashback_amount)}</td>
                  <td className="px-4 py-3"><ReferralStatusSelect id={c.id} initialStatus={c.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDate(c.converted_at)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="card p-8 text-center text-small text-text-muted">هنوز معرفی موفقی ثبت نشده است.</div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-h3 font-bold text-primary-dark">کدهای معرف</h2>
          {codesError && <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{codesError}</div>}
          {codes.length > 0 ? (
            <Table head={['کد', 'دانشجو', 'موبایل', 'کلیک‌ها', 'وضعیت']}>
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-surface-soft/40">
                  <td className="whitespace-nowrap px-4 py-3 font-mono" dir="ltr">{c.code}</td>
                  <td className="px-4 py-3">{c.user_name ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3" dir="ltr">{c.user_mobile ?? '—'}</td>
                  <td className="px-4 py-3">{c.clicks_count}</td>
                  <td className="px-4 py-3"><Badge tone={c.is_active ? 'success' : 'default'}>{c.is_active ? 'فعال' : 'غیرفعال'}</Badge></td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="card p-8 text-center text-small text-text-muted">کد معرفی ثبت نشده است.</div>
          )}
        </section>
      </div>
    </AdminPage>
  );
}
