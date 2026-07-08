import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/blocks/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { getTransformationsPage } from "@/lib/content";
import { caseStudyPortrait } from "@/lib/site-photo-paths";

function portraitSrc(item: { slug: string; portrait_image?: string }) {
  return item.portrait_image || caseStudyPortrait(item.slug);
}

export const metadata: Metadata = buildMetadata({
  title: "رضایت دانشجوها",
  description: "رضایت واقعی دانشجوها؛ بدون ژست — تجربه‌های مسیر با کمپین و برند شخصی.",
  path: "/transformations",
});

export default async function TransformationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { items: cases, meta } = await getTransformationsPage(page);

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Case Studies"
        title="رضایت واقعی"
        description="از خاموشی تا کمپینی که دیده می‌شود."
      />
      <section className="py-section-sm">
        <div className="container-luxe">
          {cases.length === 0 ? (
            <p className="text-center text-bone-dim">هنوز نظری ثبت نشده است.</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {cases.map((item, i) => (
                <Reveal key={item.slug} delay={i * 0.06}>
                  <Link
                    href={`/transformations/${item.slug}`}
                    className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/55 p-5 transition-colors hover:border-bone/25 md:p-6"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar src={portraitSrc(item)} alt={item.name} size={52} />
                        <div className="min-w-0">
                          <h2 className="truncate text-h3 leading-tight sm:whitespace-normal">{item.name}</h2>
                          <p className="text-caption text-gold">{item.role}</p>
                        </div>
                      </div>
                      <Badge tone="emerald" className="shrink-0">دانشجو</Badge>
                    </div>

                    <dl className="mt-6 grid gap-3 text-caption">
                      <div className="rounded-tile border border-bone/8 bg-ink/60 p-3">
                        <dt className="text-mist">قبل</dt>
                        <dd className="mt-1 text-bone-dim">{item.before}</dd>
                      </div>
                      <div className="rounded-tile border border-emerald/25 bg-emerald-deep/25 p-3">
                        <dt className="text-emerald-glow">بعد</dt>
                        <dd className="mt-1 text-bone">{item.after}</dd>
                      </div>
                    </dl>

                    <p className="mt-5 border-t border-bone/10 pt-5 text-bone-dim">{item.summary}</p>
                    {item.metricValue && item.metricLabel ? (
                      <p className="mt-4 font-display text-sm font-semibold text-gold num-latin">
                        {item.metricValue}
                        <span className="me-1 font-normal text-mist"> {item.metricLabel}</span>
                      </p>
                    ) : null}
                    <span className="mt-6 inline-flex items-center gap-2 text-gold">
                      مطالعه کامل
                      <ArrowLeft
                        className="rtl-flip h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}

          {meta.last_page > 1 ? (
            <div className="mt-10 flex items-center justify-center gap-3">
              {page > 1 ? (
                <Link
                  href={`/transformations?page=${page - 1}`}
                  className="inline-flex items-center gap-2 rounded-pill border border-bone/15 px-4 py-2 text-caption text-bone hover:border-bone/30"
                >
                  <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
                  قبلی
                </Link>
              ) : null}
              <span className="text-caption text-mist">
                صفحه {page.toLocaleString("fa-IR")} از {meta.last_page.toLocaleString("fa-IR")}
              </span>
              {page < meta.last_page ? (
                <Link
                  href={`/transformations?page=${page + 1}`}
                  className="inline-flex items-center gap-2 rounded-pill border border-bone/15 px-4 py-2 text-caption text-bone hover:border-bone/30"
                >
                  بعدی
                  <ArrowLeft className="h-3.5 w-3.5 rotate-180 rtl-flip" aria-hidden />
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
