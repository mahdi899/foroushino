import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, GraduationCap, Layers } from "lucide-react";
import { PageHero } from "@/components/blocks/PageHero";
import { SocialProofStats } from "@/components/sections/SocialProofStats";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { getCourses } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { courseCoverPhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "دوره‌ها",
  description:
    "دوره‌های متمرکز آکادمی؛ از مبانی پیام و طراحی پیشنهاد تا لانچ و برند شخصی — هر کدام با خروجی مشخص.",
  path: "/courses",
});

const covers = courseCoverPhotos;

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Courses"
        title="دوره‌ها"
        description="مسیرهای متمرکز و عملی؛ هر دوره یک مهارتِ مشخص با خروجیِ روشن."
      />

      <SocialProofStats className="pt-section-sm" />

      <section className="py-section-sm">
        <div className="container-luxe">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, i) => (
              <Reveal key={course.slug} delay={(i % 3) * 0.06}>
                <Link
                  href={`/courses/${course.slug}`}
                  className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 transition-colors hover:border-bone/25"
                >
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <Image
                      src={covers[i % covers.length]!}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
                    />
                    {course.featured ? (
                      <span className="absolute end-3 top-3 z-[2]">
                        <Badge tone="gold">پرطرفدار</Badge>
                      </span>
                    ) : null}
                  </div>
                  <div className="p-5 md:p-6">
                    <h2 className="text-h3 text-balance text-bone">{course.title}</h2>
                    <p className="mt-2 text-bone-dim">{course.subtitle}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-mist">
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        {course.level}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        {course.duration}
                      </span>
                    </div>
                    <span className="mt-6 inline-flex items-center gap-2 text-gold">
                      مشاهده‌ی دوره
                      <ArrowLeft
                        className="rtl-flip h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 rounded-card border border-bone/10 bg-charcoal/40 p-6 text-center md:mt-16 md:p-10">
            <Layers className="mx-auto h-7 w-7 text-gold" strokeWidth={1.4} aria-hidden />
            <h2 className="mt-4 text-h2 text-balance">به دنبال مسیر کامل هستی؟</h2>
            <p className="mt-3 text-bone-dim">
              دوره‌ی پرچم‌دار کمپین‌نویسی، نقطه‌ی ورود به اکوسیستم آکادمی است.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              <LinkButton href="/course/campaign-writing" variant="sales" size="lg" withArrow>
                دوره‌ی کمپین‌نویسی
              </LinkButton>
              <LinkButton href="/academy" variant="ghost" size="lg">
                آشنایی با آکادمی
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
