'use server';

import { redirect } from 'next/navigation';
import { studentFetch } from '@/lib/student/session';

export async function enrollMiniCourseAction(slug: string): Promise<{ ok: false; message: string } | void> {
  try {
    await studentFetch(`/mini-courses/${encodeURIComponent(slug)}/enroll`, { method: 'POST' });
  } catch {
    return { ok: false, message: 'ثبت‌نام در مینی‌دوره انجام نشد. دوباره تلاش کنید.' };
  }

  redirect(`/panel/courses?mini=${encodeURIComponent(slug)}`);
}
