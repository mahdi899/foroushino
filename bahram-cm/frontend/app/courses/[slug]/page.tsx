import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  GraduationCap,
  Quote,
  Users,
} from "lucide-react";
import { ContentViewTracker } from "@/components/analytics/ContentViewTracker";
import { ContentCommentsSection } from "@/components/comments/ContentCommentsSection";
import { TrackedCTA } from "@/components/analytics/TrackedCTA";
import { MdxBody } from "@/components/mdx/MdxBody";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PageHeroBackdrop } from "@/components/blocks/PageHeroBackdrop";
import { SiteImage } from "@/components/ui/SiteImage";
import { courseJsonLd } from "@/lib/jsonld";
import { getCourseBySlug, getCourses } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { resolveMediaAlt } from "@/lib/media/alt";
import { courseCoverPhotos } from "@/lib/site-photo-paths";
import { buildCommentAuthorFromStudent } from "@/lib/contentComments/author";
import { getContentCommentsFromApi } from "@/lib/services/contentComments.server";
import { getCurrentStudent } from "@/lib/student/session";

const covers = courseCoverPhotos;

export async function generateStaticParams() {
  const items = await getCourses();
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return {};
  return buildMetadata({
    title: course.title,
    description: course.summary,
    path: `/courses/${course.slug}`,
    type: "article",
  });
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [course, all, student, commentsResult] = await Promise.all([
    getCourseBySlug(slug),
    getCourses(),
    getCurrentStudent(),
    getContentCommentsFromApi('course', slug),
  ]);
  if (!course) notFound();
  const comments = commentsResult.ok ? commentsResult.data : [];
  const idx = all.findIndex((c) => c.slug === slug);
  const cover = covers[idx % covers.length]!;
  const coverAlt = await resolveMediaAlt(cover, `کاور ${course.title}`);
  const related = all.filter((c) => c.slug !== slug).slice(0, 3);
  const relatedCovers = await Promise.all(
    related.map(async (c, i) => ({
      slug: c.slug,
      src: covers[(idx + i + 1) % covers.length]!,
      alt: await resolveMediaAlt(covers[(idx + i + 1) % covers.length]!, `کاور ${c.title}`),
    })),
  );

  const jsonLd = {
    ...courseJsonLd(),
    name: course.title,
    description: course.summary,
    url: `https://bahramrostami.com/courses/${course.slug}`,
  };

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <ContentViewTracker type="course" slug={course.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <section className="page-hero page-hero--media relative isolate overflow-hidden bg-ink">
        <PageHeroBackdrop
          src={cover}
          alt={coverAlt}
          fallbackAlt={`کاور ${course.title}`}
          priority
        />
        <div className="container-luxe page-hero__container max-w-4xl min-w-0">
          <Reveal>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft"
            >
              <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
              همه‌ی دوره‌ها
            </Link>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="mt-6 md:mt-8">
              {course.featured ? <Badge tone="gold">دوره‌ی پرطرفدار</Badge> : null}
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <h1 className="mt-4 max-w-full min-w-0 text-h1 text-balance md:mt-5 md:text-display">
              {course.title}
            </h1>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="mt-5 max-w-2xl text-lg text-bone-dim">{course.subtitle}</p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-bone-dim">
              <span className="inline-flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-gold" strokeWidth={1.5} aria-hidden />
                {course.level}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-gold" strokeWidth={1.5} aria-hidden />
                {course.duration}
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <TrackedCTA
                href="#pricing"
                event="course_cta_click"
                eventProps={{ course: course.slug, location: "hero" }}
                variant="primary"
                size="lg"
              >
                شروع این مسیر
              </TrackedCTA>
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 text-gold transition-colors hover:text-gold-soft"
              >
                مشاهده‌ی هزینه
                <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* OUTCOMES */}
      {course.outcomes.length ? (
        <section className="py-section-sm">
          <div className="container-luxe">
            <Reveal>
              <Eyebrow>چه چیزی به دست می‌آوری</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 max-w-3xl text-h2 text-balance">خروجی‌های روشن این دوره.</h2>
            </Reveal>
            <ul className="mt-8 grid gap-4 md:mt-12 md:grid-cols-2">
              {course.outcomes.map((o, i) => (
                <Reveal key={o} delay={i * 0.05}>
                  <li className="flex items-start gap-3 rounded-card border border-bone/10 bg-charcoal/40 p-5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-glow" strokeWidth={1.6} aria-hidden />
                    <span className="text-bone-dim">{o}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* AUDIENCE */}
      {course.audience.length ? (
        <section className="bg-obsidian py-section-sm">
          <div className="container-luxe">
            <Reveal>
              <Eyebrow>برای چه کسی است</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 max-w-3xl text-h2 text-balance">این مسیر برای توست اگر…</h2>
            </Reveal>
            <div className="mt-8 grid gap-4 md:mt-12 md:grid-cols-3">
              {course.audience.map((a, i) => (
                <Reveal key={a} delay={i * 0.06}>
                  <div className="h-full rounded-card border border-bone/10 bg-charcoal/40 p-6">
                    <Users className="h-6 w-6 text-gold" strokeWidth={1.4} aria-hidden />
                    <p className="mt-4 text-bone-dim">{a}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* CURRICULUM */}
      {course.curriculum.length ? (
        <section className="py-section-sm">
          <div className="container-luxe">
            <Reveal>
              <Eyebrow>سرفصل‌ها</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 max-w-3xl text-h2 text-balance">برنامه‌ی دوره.</h2>
            </Reveal>
            <div className="mt-8 grid gap-5 md:mt-12 md:grid-cols-2">
              {course.curriculum.map((mod, i) => (
                <Reveal key={mod.title} delay={i * 0.05}>
                  <div className="h-full rounded-card border border-bone/10 bg-charcoal/40 p-6">
                    <p className="text-caption uppercase tracking-[0.2em] text-gold">
                      بخش {(i + 1).toLocaleString("fa-IR")}
                    </p>
                    <h3 className="mt-2 text-h3 text-bone">{mod.title}</h3>
                    <ul className="mt-4 space-y-2">
                      {mod.lessons.map((l) => (
                        <li key={l} className="flex items-start gap-2 text-bone-dim">
                          <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.6} aria-hidden />
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* BODY */}
      {course.body ? (
        <section className="py-section-sm">
          <div className="container-luxe max-w-3xl min-w-0">
            <article className="prose-luxe text-bone-dim">
              <MdxBody source={course.body} />
            </article>
          </div>
        </section>
      ) : null}

      {/* TESTIMONIALS */}
      {course.testimonials.length ? (
        <section className="bg-obsidian py-section-sm">
          <div className="container-luxe">
            <Reveal>
              <Eyebrow>نتیجه‌ی دانشجوها</Eyebrow>
            </Reveal>
            <div className="mt-8 grid gap-5 md:mt-12 md:grid-cols-2">
              {course.testimonials.map((t, i) => (
                <Reveal key={t.name} delay={i * 0.06}>
                  <figure className="h-full rounded-card border border-bone/10 bg-charcoal/40 p-6 md:p-8">
                    <Quote className="h-7 w-7 text-gold/50" strokeWidth={1.4} aria-hidden />
                    <blockquote className="mt-4 text-lg text-bone">«{t.quote}»</blockquote>
                    <figcaption className="mt-5 text-caption text-mist">
                      <span className="text-bone">{t.name}</span> — {t.role}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* PRICING */}
      {course.pricing.length ? (
        <section id="pricing" className="py-section-sm scroll-mt-24">
          <div className="container-luxe">
            <Reveal>
              <Eyebrow>هزینه و ثبت‌نام</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 max-w-3xl text-h2 text-balance">یک سرمایه‌گذاری روشن.</h2>
            </Reveal>
            <div className="mt-8 grid gap-5 md:mt-12 md:grid-cols-2 lg:grid-cols-3">
              {course.pricing.map((tier) => (
                <div
                  key={tier.name}
                  data-neon-tone={tier.highlighted ? "gold" : "emerald"}
                  className={
                    "neon-surface-static flex h-full flex-col rounded-card border bg-charcoal/45 p-6 md:p-8 " +
                    (tier.highlighted ? "border-gold/40" : "border-bone/10")
                  }
                >
                  <p className="text-caption uppercase tracking-[0.2em] text-gold">{tier.name}</p>
                  <p className="mt-3 text-h2 text-bone num-latin">{tier.price}</p>
                  {tier.note ? <p className="mt-2 text-caption text-mist">{tier.note}</p> : null}
                  <ul className="mt-6 space-y-2">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-bone-dim">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.6} aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      {course.faqs.length ? (
        <section className="bg-obsidian py-section-sm">
          <div className="container-luxe">
            <Reveal>
              <Eyebrow>پرسش‌های رایج</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 max-w-3xl text-h2 text-balance">قبل از تصمیم.</h2>
            </Reveal>
            <div className="mt-8 md:mt-12">
              <Reveal>
                <Accordion items={course.faqs.map((f) => ({ question: f.q, answer: f.a }))} />
              </Reveal>
            </div>
          </div>
        </section>
      ) : null}

      {/* RELATED */}
      {related.length ? (
        <section className="py-section-sm">
          <div className="container-luxe">
            <p className="text-caption uppercase tracking-[0.25em] text-gold">دوره‌های مرتبط</p>
            <h2 className="mt-4 text-h2 text-balance">مسیرهای بعدی.</h2>
            <div className="mt-7 grid gap-5 md:mt-10 md:grid-cols-3">
              {related.map((c, i) => {
                const thumb = relatedCovers[i]!;
                return (
                <Link
                  key={c.slug}
                  href={`/courses/${c.slug}`}
                  className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 p-6 transition-colors hover:border-bone/25"
                >
                  <SiteImage
                    src={thumb.src}
                    alt={thumb.alt}
                    fallbackAlt={`کاور ${c.title}`}
                    width={64}
                    height={64}
                    className="h-12 w-12 rounded-tile object-cover"
                  />
                  <h3 className="mt-4 text-h3 text-balance text-bone">{c.title}</h3>
                  <p className="mt-2 text-bone-dim">{c.subtitle}</p>
                </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <ContentCommentsSection
        type="course"
        slug={course.slug}
        initialComments={comments}
        initialAuthor={buildCommentAuthorFromStudent(student)}
      />
    </main>
  );
}
