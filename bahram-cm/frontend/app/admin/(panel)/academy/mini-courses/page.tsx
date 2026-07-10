import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, Badge, EditLink, Table } from '../../ui';
import { getMiniCourses } from '@/lib/admin/miniCourseData';
import { resolveMiniCourseCover } from '@/lib/mini-courses/covers';
import { MiniCourseRowThumb } from './MiniCourseRowThumb';

export const dynamic = 'force-dynamic';

export default async function MiniCoursesAdminPage() {
  const { items, error } = await getMiniCourses();
  const activeCount = items.filter((c) => c.is_active).length;
  const rows = items.map((course, index) => ({
    course,
    cover: resolveMiniCourseCover(course.slug, index, course.thumbnail),
    index,
  }));

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
              head={['', 'عنوان', 'اسلاگ', 'سطح', 'مدت', 'ترتیب', 'وضعیت', 'عملیات']}
              mobile={rows.map(({ course, cover }) => (
                <AdminTableCard
                  key={course.id}
                  leading={<MiniCourseRowThumb title={course.title} image={cover} />}
                  title={course.title}
                  fields={[
                    { label: 'اسلاگ', value: course.slug, mono: true },
                    { label: 'سطح', value: course.level ?? '—' },
                    { label: 'مدت', value: course.duration ?? '—' },
                    { label: 'ترتیب', value: course.sort_order },
                    {
                      label: 'وضعیت',
                      value: (
                        <Badge tone={course.is_active ? 'success' : 'default'}>
                          {course.is_active ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      ),
                    },
                  ]}
                  footer={<EditLink href={`/admin/academy/mini-courses/${course.id}`} />}
                />
              ))}
            >
              {rows.map(({ course, cover }) => (
                <tr key={course.id} className="hover:bg-surface-soft/40">
                  <td className="px-4 py-3">
                    <MiniCourseRowThumb title={course.title} image={cover} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{course.title}</p>
                    {course.subtitle ? <p className="text-caption text-text-muted">{course.subtitle}</p> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-caption" dir="ltr">
                    {course.slug}
                  </td>
                  <td className="px-4 py-3 text-caption">{course.level ?? '—'}</td>
                  <td className="px-4 py-3 text-caption">{course.duration ?? '—'}</td>
                  <td className="px-4 py-3 text-caption">{course.sort_order}</td>
                  <td className="px-4 py-3">
                    <Badge tone={course.is_active ? 'success' : 'default'}>
                      {course.is_active ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <EditLink href={`/admin/academy/mini-courses/${course.id}`} />
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
