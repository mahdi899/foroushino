import { notFound } from 'next/navigation';
import { getMiniCourse, getMiniCourseComments } from '@/lib/admin/miniCourseData';
import { MiniCourseForm } from '../MiniCourseForm';

export const dynamic = 'force-dynamic';

export default async function EditMiniCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = Number(id);
  const [course, commentsResult] = await Promise.all([
    getMiniCourse(courseId),
    getMiniCourseComments(courseId),
  ]);

  if (!course) notFound();

  return (
    <MiniCourseForm
      course={course}
      comments={commentsResult.items}
      commentsError={commentsResult.error}
    />
  );
}
