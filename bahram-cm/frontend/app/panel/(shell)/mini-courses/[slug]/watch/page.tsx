import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clapperboard } from 'lucide-react';
import { ArticleVideoEmbed } from '@/components/blog/ArticleVideoEmbed';
import { parseAparatHash } from '@/lib/article/videoEmbed';
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

  const aparatHash = parseAparatHash(data.aparat_hash) ?? data.aparat_hash;

  return (
    <div className="panel-page-inner flex flex-col gap-6">
      <section className="panel-page-header panel-mini-watch-header">
        <div className="panel-mini-watch-header__top">
          <Link href="/panel/courses" className="panel-mini-watch-back">
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            بازگشت به دوره‌های من
          </Link>

          {data.enrollment_number ? (
            <p className="panel-mini-watch-order">
              شماره سفارش:{' '}
              <span className="num-latin font-medium text-text" dir="ltr">
                {data.enrollment_number}
              </span>
            </p>
          ) : null}
        </div>

        <div className="panel-mini-watch-header__main">
          <span className="panel-page-header__icon" aria-hidden>
            <Clapperboard size={24} strokeWidth={2} />
          </span>
          <div>
            <h1 className="panel-page-header__title">{data.title}</h1>
            {data.subtitle ? (
              <p className="panel-page-header__desc">{data.subtitle}</p>
            ) : (
              <p className="panel-page-header__desc">مینی‌دوره رایگان</p>
            )}
          </div>
        </div>
      </section>

      <div className="card overflow-hidden p-0">
        <ArticleVideoEmbed aparat={aparatHash} active="aparat" eager className="my-0" />
      </div>
    </div>
  );
}
