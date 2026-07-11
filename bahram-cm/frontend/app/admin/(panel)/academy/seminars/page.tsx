import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, Badge, EditLink, StatCard, Table } from '../../ui';
import { getSeminars } from '@/lib/admin/academyData';
import { formatDateTime, formatToman } from '@/lib/admin/academyTypes';
import { CreateSeminarForm } from './CreateSeminarForm';

export const dynamic = 'force-dynamic';

export default async function SeminarsPage() {
  const { items: seminars, error } = await getSeminars();

  const publishedCount = seminars.filter((s) => s.status === 'published').length;
  const totalAttendees = seminars.reduce((sum, s) => sum + s.attendees_count, 0);
  const fullCount = seminars.filter((s) => s.is_full).length;

  return (
    <AdminPage
      title="سمینارها"
      desc="مدیریت سمینارها، شرکت‌کنندگان، فایل‌ها و گواهی‌ها"
      icon="CalendarDays"
      headerVariant="academy"
    >
      <div className="admin-content-list">
        {seminars.length > 0 ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatCard
              label="کل سمینارها"
              value={seminars.length.toLocaleString('fa-IR')}
              icon="CalendarDays"
              tone="teal"
            />
            <StatCard
              label="منتشر شده"
              value={publishedCount.toLocaleString('fa-IR')}
              icon="Eye"
              tone="blue"
            />
            <StatCard
              label="شرکت‌کنندگان"
              value={totalAttendees.toLocaleString('fa-IR')}
              icon="Users"
              tone="gold"
              hint={fullCount > 0 ? `${fullCount.toLocaleString('fa-IR')} سمینار پر ظرفیت` : undefined}
            />
          </div>
        ) : null}

        <AdminContentPanel title="ایجاد سمینار جدید" className="mb-5">
          <CreateSeminarForm />
        </AdminContentPanel>

        {error ? <div className="admin-content-list__error">{error}</div> : null}

        <AdminContentPanel
          title="فهرست سمینارها"
          summary={
            seminars.length > 0 ? (
              <>
                {seminars.length.toLocaleString('fa-IR')} سمینار · {publishedCount.toLocaleString('fa-IR')} منتشر
                شده
              </>
            ) : undefined
          }
        >
          {seminars.length > 0 ? (
            <Table
              head={['عنوان', 'تاریخ', 'قیمت', 'ظرفیت', 'شرکت‌کنندگان', 'عملیات']}
              mobile={seminars.map((s) => (
                <AdminTableCard
                  key={s.id}
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {s.title}
                      {s.is_full ? <Badge tone="danger">ظرفیت پر</Badge> : null}
                      {s.status === 'published' ? <Badge tone="success">منتشر</Badge> : null}
                    </span>
                  }
                  fields={[
                    { label: 'تاریخ', value: formatDateTime(s.date) },
                    { label: 'قیمت', value: s.price ? formatToman(s.price) : '—' },
                    {
                      label: 'ظرفیت',
                      value: s.capacity != null ? `${s.attendees_count} / ${s.capacity}` : 'نامحدود',
                    },
                    { label: 'شرکت‌کنندگان', value: s.attendees_count.toLocaleString('fa-IR') },
                  ]}
                  footer={<EditLink href={`/admin/academy/seminars/${s.id}`} />}
                />
              ))}
            >
              {seminars.map((s) => (
                <tr key={s.id} className="hover:bg-surface-soft/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {s.is_full ? <span className="text-caption text-error">ظرفیت پر</span> : null}
                      {s.status === 'published' ? (
                        <Badge tone="success">منتشر</Badge>
                      ) : s.status === 'draft' ? (
                        <Badge tone="default">پیش‌نویس</Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDateTime(s.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-caption">
                    {s.price ? formatToman(s.price) : '—'}
                  </td>
                  <td className="px-4 py-3 text-caption">
                    {s.capacity != null ? `${s.attendees_count} / ${s.capacity}` : 'نامحدود'}
                  </td>
                  <td className="px-4 py-3">{s.attendees_count.toLocaleString('fa-IR')}</td>
                  <td className="px-4 py-3">
                    <EditLink href={`/admin/academy/seminars/${s.id}`} />
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <AdminListEmpty
              icon="CalendarDays"
              title="هنوز سمیناری ثبت نشده"
              description="با فرم بالا اولین سمینار را بسازید و شرکت‌کنندگان، فایل‌ها و گواهی‌ها را مدیریت کنید."
              action={
                <Link href="#create-seminar" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  ایجاد سمینار
                </Link>
              }
            />
          )}
        </AdminContentPanel>
      </div>
    </AdminPage>
  );
}
