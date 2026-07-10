import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, Badge, EditLink, Table } from '../../ui';
import { getMiniCourses } from '@/lib/admin/miniCourseData';

export const dynamic = 'force-dynamic';

export default async function MiniCoursesAdminPage() {
  const { items, error } = await getMiniCourses();
  const activeCount = items.filter((c) => c.is_active).length;

  return (
    <AdminPage
      title="مینی‌دوره‌ها"
      desc="ویدیوهای رایگان آپارات با تامبنیل، توضیحات و نظرات"
      icon="PlayCircle"
      headerVariant="academy"
      action={
        <Link href="/admin/academy/mini-courses/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> مینی‌دوره جدید
        </Link>
      }
    >
      <div className="admin-content-list">
        {error ? <div className="admin-content-list__error">{error}</div> : null}

        <AdminContentPanel
          title="فهرست مینی‌دوره‌ها"
          summary={
            <>
              {items.length.toLocaleString('fa-IR')} دوره · {activeCount.toLocaleString('fa-IR')} فعال
            </>
          }
        >
          {items.length > 0 ? (
            <Table
              head={['عنوان', 'اسلاگ', 'سطح', 'مدت', 'ترتیب', 'وضعیت', 'عملیات']}
              mobile={items.map((c) => (
                <AdminTableCard
                  key={c.id}
                  title={c.title}
                  fields={[
                    { label: 'اسلاگ', value: c.slug, mono: true },
                    { label: 'سطح', value: c.level ?? '—' },
                    { label: 'مدت', value: c.duration ?? '—' },
                    { label: 'ترتیب', value: c.sort_order },
                    {
                      label: 'وضعیت',
                      value: (
                        <Badge tone={c.is_active ? 'success' : 'default'}>
                          {c.is_active ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      ),
                    },
                  ]}
                  footer={<EditLink href={`/admin/academy/mini-courses/${c.id}`} />}
                />
              ))}
            >
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-surface-soft/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.title}</p>
                    {c.subtitle ? <p className="text-caption text-text-muted">{c.subtitle}</p> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-caption" dir="ltr">
                    {c.slug}
                  </td>
                  <td className="px-4 py-3 text-caption">{c.level ?? '—'}</td>
                  <td className="px-4 py-3 text-caption">{c.duration ?? '—'}</td>
                  <td className="px-4 py-3 text-caption">{c.sort_order}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.is_active ? 'success' : 'default'}>
                      {c.is_active ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <EditLink href={`/admin/academy/mini-courses/${c.id}`} />
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <AdminListEmpty
              icon="PlayCircle"
              title="مینی‌دوره‌ای ثبت نشده"
              description="مینی‌دوره‌های رایگان در صفحه دوره‌ها و صفحه اختصاصی نمایش داده می‌شوند."
              action={
                <Link href="/admin/academy/mini-courses/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  افزودن مینی‌دوره
                </Link>
              }
            />
          )}
        </AdminContentPanel>
      </div>
    </AdminPage>
  );
}
