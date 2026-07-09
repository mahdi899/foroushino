import { AdminPage, EditLink, Table } from '../../ui';
import { getSeminars } from '@/lib/admin/academyData';
import { formatDateTime, formatToman } from '@/lib/admin/academyTypes';
import { CreateSeminarForm } from './CreateSeminarForm';

export const dynamic = 'force-dynamic';

export default async function SeminarsPage() {
  const { items: seminars, error } = await getSeminars();

  return (
    <AdminPage title="سمینارها" desc="مدیریت سمینارها، شرکت‌کنندگان، فایل‌ها و گواهی‌ها">
      <CreateSeminarForm />

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      )}

      {seminars.length > 0 ? (
        <Table head={['عنوان', 'تاریخ', 'قیمت', 'ظرفیت', 'شرکت‌کنندگان', 'عملیات']}>
          {seminars.map((s) => (
            <tr key={s.id} className="hover:bg-surface-soft/40">
              <td className="px-4 py-3">
                <div>{s.title}</div>
                {s.is_full ? <span className="text-caption text-error">ظرفیت پر</span> : null}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDateTime(s.date)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-caption">{s.price ? formatToman(s.price) : '—'}</td>
              <td className="px-4 py-3 text-caption">
                {s.capacity != null ? `${s.attendees_count} / ${s.capacity}` : 'نامحدود'}
              </td>
              <td className="px-4 py-3">{s.attendees_count}</td>
              <td className="px-4 py-3"><EditLink href={`/admin/academy/seminars/${s.id}`} /></td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">هنوز سمیناری ثبت نشده</p>
        </div>
      )}
    </AdminPage>
  );
}
