import { AdminPage, Table } from '../../ui';
import { getSatApplications } from '@/lib/admin/academyData';
import { formatDate } from '@/lib/admin/academyTypes';
import { SatStatusSelect } from './SatStatusSelect';

export const dynamic = 'force-dynamic';

export default async function SatApplicationsPage() {
  const { items: applications, error } = await getSatApplications();

  return (
    <AdminPage title="درخواست‌های سات" desc="بررسی و پاسخ به درخواست‌های ورود به دوره SAT">
      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      )}

      {applications.length > 0 ? (
        <Table head={['نام', 'موبایل', 'شهر', 'سن', 'وضعیت', 'تاریخ ثبت']}>
          {applications.map((a) => (
            <tr key={a.id} className="hover:bg-surface-soft/40">
              <td className="px-4 py-3">{a.name}</td>
              <td className="whitespace-nowrap px-4 py-3" dir="ltr">{a.mobile}</td>
              <td className="px-4 py-3">{a.city ?? '—'}</td>
              <td className="px-4 py-3">{a.age ?? '—'}</td>
              <td className="px-4 py-3"><SatStatusSelect id={a.id} initialStatus={a.status} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDate(a.submitted_at)}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">هنوز درخواستی ثبت نشده</p>
        </div>
      )}
    </AdminPage>
  );
}
