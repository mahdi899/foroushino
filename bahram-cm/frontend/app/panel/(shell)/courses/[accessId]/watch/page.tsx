import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { studentFetch } from '@/lib/student/session';
import { WatchPageClient } from './WatchPageClient';

export const metadata: Metadata = { title: 'تماشای دوره | پنل کاربری', robots: { index: false, follow: false } };

interface PlayerResponse {
  available: boolean;
  message?: string;
  product_title?: string | null;
  license_key?: string | null;
  spotplayer_course_id?: string | null;
  license_script_url?: string | null;
}

export default async function CourseWatchPage({ params }: { params: Promise<{ accessId: string }> }) {
  const { accessId } = await params;
  const { data } = await studentFetch<{ data: PlayerResponse }>(`/courses/${accessId}/player`);

  if (!data) notFound();

  if (!data.available || !data.license_key || !data.spotplayer_course_id) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card p-8 text-center">
          <h1 className="mb-3 text-xl font-bold text-text">{data.product_title ?? 'دوره'}</h1>
          <p className="mb-5 text-sm text-text-muted">{data.message ?? 'دسترسی پخش داخل سایت برای این دوره فعال نیست.'}</p>
          <a href="/panel/support" className="btn btn-primary inline-flex">تماس با پشتیبانی</a>
        </div>
      </div>
    );
  }

  return (
    <WatchPageClient
      title={data.product_title ?? 'دوره'}
      licenseKey={data.license_key}
      courseId={data.spotplayer_course_id}
      licenseScriptUrl={data.license_script_url ?? null}
    />
  );
}
