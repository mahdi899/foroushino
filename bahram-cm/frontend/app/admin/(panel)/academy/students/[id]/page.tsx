import { notFound } from 'next/navigation';
import { AdminPage, Badge } from '../../../ui';
import { getStudent } from '@/lib/admin/academyData';
import { STUDENT_STATUS_LABELS, formatDateTime, formatToman } from '@/lib/admin/academyTypes';
import { StudentStatusForm } from '../StudentStatusForm';

export const dynamic = 'force-dynamic';

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudent(Number(id));
  if (!student) notFound();

  return (
    <AdminPage title={student.name} desc={student.mobile ?? student.email ?? ''}>
      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="mb-4 text-h3 font-bold text-primary-dark">اطلاعات حساب</h2>
          <dl className="grid gap-3 text-small md:grid-cols-3">
            <div><dt className="text-text-muted">موبایل</dt><dd dir="ltr">{student.mobile ?? '—'}</dd></div>
            <div><dt className="text-text-muted">ایمیل</dt><dd>{student.email ?? '—'}</dd></div>
            <div><dt className="text-text-muted">وضعیت فعلی</dt><dd><Badge tone={student.status === 'active' ? 'success' : 'warning'}>{STUDENT_STATUS_LABELS[student.status]}</Badge></dd></div>
            <div><dt className="text-text-muted">اولین ورود</dt><dd>{formatDateTime(student.first_login_at)}</dd></div>
            <div><dt className="text-text-muted">آخرین ورود</dt><dd>{formatDateTime(student.last_login_at)}</dd></div>
            <div><dt className="text-text-muted">تاریخ ثبت‌نام</dt><dd>{formatDateTime(student.created_at)}</dd></div>
          </dl>
          <div className="mt-5 border-t border-border pt-4">
            <StudentStatusForm studentId={student.id} initialStatus={student.status} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-h3 font-bold text-primary-dark">دسترسی به دوره‌ها</h2>
          {student.course_accesses.length > 0 ? (
            <ul className="divide-y divide-border text-small">
              {student.course_accesses.map((ca) => (
                <li key={ca.id} className="flex items-center justify-between py-2">
                  <span>{ca.product_title ?? '—'}</span>
                  <Badge tone={ca.status === 'active' ? 'success' : 'default'}>{ca.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-text-muted">دسترسی فعالی ثبت نشده است.</p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-h3 font-bold text-primary-dark">سفارش‌ها</h2>
          {student.orders.length > 0 ? (
            <ul className="divide-y divide-border text-small">
              {student.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <span dir="ltr">{o.order_number}</span>
                  <span>{formatToman(o.final_amount)}</span>
                  <Badge tone={o.status === 'paid' || o.status === 'fulfilled' ? 'success' : 'default'}>{o.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-text-muted">سفارشی ثبت نشده است.</p>
          )}
        </div>

        {student.sat_applications.length > 0 && (
          <div className="card p-6">
            <h2 className="mb-4 text-h3 font-bold text-primary-dark">درخواست سات</h2>
            <ul className="divide-y divide-border text-small">
              {student.sat_applications.map((sa) => (
                <li key={sa.id} className="flex items-center justify-between py-2">
                  <span>درخواست #{sa.id}</span>
                  <Badge>{sa.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
