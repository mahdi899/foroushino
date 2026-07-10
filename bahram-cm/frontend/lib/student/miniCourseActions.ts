'use server';

import { redirect } from 'next/navigation';
import { studentFetch } from '@/lib/student/session';

export type MiniCourseEnrollmentStatus = {
  enrolled: boolean;
  enrollmentNumber: string | null;
};

export async function getMiniCourseEnrollmentStatusAction(
  slug: string,
): Promise<MiniCourseEnrollmentStatus> {
  try {
    const res = await studentFetch<{
      data: {
        enrolled: boolean;
        order_number?: string | null;
        enrollment_number?: string | null;
      };
    }>(`/mini-courses/${encodeURIComponent(slug)}`);

    return {
      enrolled: Boolean(res.data.enrolled),
      enrollmentNumber: res.data.order_number ?? res.data.enrollment_number ?? null,
    };
  } catch {
    return { enrolled: false, enrollmentNumber: null };
  }
}

export async function enrollMiniCourseAction(slug: string): Promise<{ ok: false; message: string } | void> {
  try {
    await studentFetch(`/mini-courses/${encodeURIComponent(slug)}/enroll`, { method: 'POST' });
  } catch {
    return { ok: false, message: 'ثبت‌نام در مینی‌دوره انجام نشد. دوباره تلاش کنید.' };
  }

  redirect(`/panel/courses?mini=${encodeURIComponent(slug)}`);
}
