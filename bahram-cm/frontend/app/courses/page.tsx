import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, GraduationCap } from "lucide-react";
import { PageHero } from "@/components/blocks/PageHero";
import { SocialProofStats } from "@/components/sections/SocialProofStats";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { SiteImage } from "@/components/ui/SiteImage";
import { site } from "@/content/site";
import { buildMetadata } from "@/lib/seo";
import { resolveMediaAlt } from "@/lib/media/alt";
import { sitePhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "دوره‌ها",
  description: "دو مسیر اصلی آکادمی؛ کمپین‌نویسی و سات — هر کدام با خروجی مشخص.",
  path: "/courses",
});

const courseMeta = [
  {
    level: "مسیر حرفه‌ای",
    duration: "۱۰ فصل",
    featured: true,
    image: sitePhotos.courseBackstage,
  },
  {
    level: "سیستم عملیاتی",
    duration: "مسیر WAP",
    featured: false,
    image: sitePhotos.landscapeSession,
  },
] as const;

const courses = site.mainPaths.items.map((item, i) => ({
  ...item,
  subtitle: `${item.tagline} — ${item.description}`,
  ...courseMeta[i]!,
}));

export default async function CoursesPage() {
  const courseCards = await Promise.all(
    courses.map(async (course) => ({
      ...course,
      imageAlt: await resolveMediaAlt(course.image, `کاور ${course.label}`),
    })),
  );

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Courses"
        title="دوره‌ها"
        description="دو مسیر اصلی آکادمی؛ کمپین‌نویسی و سات — هر کدام با خروجی روشن."
      />

      <SocialProofStats className="pt-section-sm" />

      <section className="py-section-sm">
        <div className="container-luxe">
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2 md:gap-6">
            {courseCards.map((course, i) => (
              <Reveal key={course.href} delay={i * 0.06}>
                <Link
                  href={course.href}
                  className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 transition-colors hover:border-bone/25"
                >
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <SiteImage
                      src={course.image}
                      alt={course.imageAlt}
                      fallbackAlt={`کاور ${course.label}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
                    />
                    {course.featured ? (
                      <span className="absolute end-3 top-3 z-[2]">
                        <Badge tone="gold">پرچم‌دار</Badge>
                      </span>
                    ) : null}
                  </div>
                  <div className="p-5 md:p-6">
                    <h2 className="text-h3 text-balance text-bone">{course.label}</h2>
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
                      {course.cta}
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
        </div>
      </section>
    </main>
  );
}
