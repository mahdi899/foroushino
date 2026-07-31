import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'تماشای دوره | پنل کاربری', robots: { index: false, follow: false } };

export const dynamic = 'force-dynamic';

// پخش آنلاین دوره فعلاً غیرفعال است؛ مشاهده فقط از طریق اسپات‌پلیر با توکن لایسنس انجام می‌شود.
export default async function CourseWatchPage() {
  redirect('/panel/courses');
}
