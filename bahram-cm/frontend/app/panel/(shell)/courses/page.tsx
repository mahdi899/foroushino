import type { Metadata } from 'next';
import { BookOpen, Shield } from 'lucide-react';
import {
  CourseAccessCard,
  type StudentCourseAccess,
} from '@/components/student-panel/courses/CourseAccessCard';
import { CourseSideModules } from '@/components/student-panel/courses/CourseSideModules';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const dynamic = 'force-dynamic';

function isActiveCourse(course: StudentCourseAccess): boolean {
  if (!course.is_active || course.pending_activation) {
    return false;
  }

  const needsSpotPlayer = Boolean(course.product?.spotplayer_course_id);
  if (needsSpotPlayer) {
    return Boolean(course.spotplayer?.license_key);
  }

  return true;
}

export const metadata: Metadata = {
  title: 'دوره‌های من | پنل کاربری',
  robots: { index: false, follow: false },
};

export default async function PanelCoursesPage() {
  const response = await panelStudentFetch<{ data: StudentCourseAccess[] }>('/courses');
  const courses = Array.isArray(response.data) ? response.data.filter(isActiveCourse) : [];

  if (courses.length === 0) {
    return (
      <div className="panel-page-inner flex flex-col gap-6">
        <PanelPageHeader
          icon={BookOpen}
          title="دوره‌های من"
          description="دوره‌های فعال و محتوای آموزشی اختصاصی شما"
        />
        <div className="panel-empty-state card flex flex-col items-center gap-4 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen size={32} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">هیچ دوره‌ای یافت نشد</h2>
            <p className="panel-card-text mt-2">هنوز دوره‌ای برای شما فعال نشده است.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-page-inner flex flex-col gap-6">
      <PanelPageHeader
        icon={BookOpen}
        title="دوره‌های من"
        description={`${courses.length.toLocaleString('fa-IR')} دوره با دسترسی فعال`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {renderCourseCards(courses)}
      </div>

      <CourseSideModules />

      <div className="card flex flex-col items-center gap-3 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-4 sm:flex-row">
        <Shield size={18} className="shrink-0 text-primary" />
        <p className="panel-card-text text-center leading-relaxed sm:text-right">
          محتوای دوره‌ها به صورت امن و اختصاصی ارائه می‌شود و امکان دانلود فایل‌های ویدئویی وجود ندارد.
        </p>
      </div>
    </div>
  );
}

function renderCourseCards(courses: StudentCourseAccess[]) {
  const seenLicenseKeys = new Set<string>();

  return courses.map((course) => {
    const normalizedKey = course.spotplayer?.license_key?.trim().toUpperCase() ?? '';
    const showLicenseKey = !normalizedKey || !seenLicenseKeys.has(normalizedKey);
    if (normalizedKey) {
      seenLicenseKeys.add(normalizedKey);
    }

    return (
      <CourseAccessCard
        key={course.list_key ?? course.license_id ?? `product-${course.product?.id}`}
        course={course}
        showLicenseKey={showLicenseKey}
      />
    );
  });
}
