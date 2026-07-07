import type { Metadata } from 'next';
import { BookOpen, PlayCircle } from 'lucide-react';
import { studentFetch } from '@/lib/student/session';

export const metadata: Metadata = { title: 'دوره من | پنل کاربری', robots: { index: false, follow: false } };

interface CourseAccess {
  id: number;
  product: { id: number; title: string; slug: string } | null;
  status: string;
  is_active: boolean;
  activated_at: string | null;
  spotplayer: { status: string; license_url: string | null } | null;
}

export default async function PanelCoursesPage() {
  const { data: courses } = await studentFetch<{ data: CourseAccess[] }>('/courses');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold text-text">دوره من</h1>

      {courses.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <BookOpen size={32} className="text-text-muted" />
          <p className="text-sm text-text-muted">هنوز دوره‌ای برای شما فعال نشده است.</p>
        </div>
      ) : (
        courses.map((course) => (
          <div key={course.id} className="card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-text">{course.product?.title ?? 'دوره'}</h2>
              <span className={`badge mt-2 ${course.is_active ? 'badge-success' : 'badge-neutral'}`}>
                {course.is_active ? 'فعال' : 'غیرفعال'}
              </span>
            </div>
            {course.is_active && course.spotplayer?.license_url ? (
              <a
                href={course.spotplayer.license_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <PlayCircle size={18} />
                مشاهده دوره
              </a>
            ) : (
              <span className="text-sm text-text-muted">لینک دوره به‌زودی فعال می‌شود.</span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
