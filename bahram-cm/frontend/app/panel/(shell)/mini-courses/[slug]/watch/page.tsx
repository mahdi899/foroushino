import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clapperboard } from 'lucide-react';
import { ArticleVideoEmbed } from '@/components/blog/ArticleVideoEmbed';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const metadata: Metadata = {
  title: 'تماشای مینی‌دوره | پنل کاربری',
  robots: { index: false, follow: false },
};

interface MiniCoursePlayerResponse {
  available: boolean;
  title: string;
  subtitle?: string | null;
  enrollment_number?: string;
  aparat_hash?: string;
}

type PageProps = { params: Promise<{ slug: string }> };

export default async function MiniCourseWatchPage({ params }: PageProps) {
  const { slug } = await params;
  const { data } = await panelStudentFetch<{ data: MiniCoursePlayerResponse }>(
    `/mini-courses/${encodeURIComponent(slug)}/player`,
  );

  if (!data?.available || !data.aparat_hash) {
    return (
      <div className="panel-page-inner">
        <div className="card p-8 text-center">
          <h1 className="mb-3 text-xl font-bold text-text">{data?.title ?? 'مینی‌دوره'}</h1>
          <p className="mb-5 text-sm text-text-muted">
            برای تماشای این ویدیو ابتدا باید در مینی‌دوره ثبت‌نام کنید.
          </p>
          <Link href={`/mini-courses/${slug}`} className="btn btn-primary inline-flex">
            بازگشت به صفحه مینی‌دوره
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-page-inner flex flex-col gap-6">
      <PanelPageHeader
        icon={Clapperboard}
        title={data.title}
        description={data.subtitle ?? 'مینی‌دوره رایگان'}
      />

      {data.enrollment_number ? (
        <p className="panel-text-meta text-text-muted">
          شماره ثبت‌نام:{' '}
          <span className="num-latin font-medium text-text" dir="ltr">
            {data.enrollment_number}
          </span>
        </p>
      ) : null}

      <div className="card overflow-hidden p-0">
        <ArticleVideoEmbed aparat={data.aparat_hash} eager />
      </div>

      <Link href="/panel/courses" className="btn btn-ghost inline-flex w-fit items-center gap-2 self-start">
        <ArrowRight className="h-4 w-4" aria-hidden />
        بازگشت به دوره‌های من
      </Link>
    </div>
  );
}
