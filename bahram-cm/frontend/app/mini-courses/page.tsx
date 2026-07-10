import type { Metadata } from "next";
import { PageHero } from "@/components/blocks/PageHero";
import { MiniCourseCard } from "@/components/mini-courses/MiniCourseCard";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getMiniCoursesFromApi } from "@/lib/services/miniCourses";
import { resolveMediaAlt } from "@/lib/media/alt";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "مینی‌دوره‌ها",
  description: "ویدیوهای رایگان برای ورود سریع به تفکر کمپین‌محور؛ نقطه‌ی شروع قبل از مسیر اصلی.",
  path: "/mini-courses",
});

export default async function MiniCoursesPage() {
  const result = await getMiniCoursesFromApi();
  const miniCourses = result.ok ? result.data : [];

  const cards = await Promise.all(
    miniCourses.map(async (course, i) => ({
      course,
      imageAlt: course.thumbnail
        ? await resolveMediaAlt(course.thumbnail, course.title)
        : course.title,
      index: i,
    })),
  );

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Mini Courses"
        title="مینی‌دوره‌ها"
        description="ویدیوهای رایگان برای ورود سریع؛ نقطه‌ی شروع قبل از مسیر اصلی."
      />
      <section className="py-section-sm">
        {cards.length > 0 ? (
          <div className="container-luxe grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {cards.map(({ course, imageAlt, index }) => (
              <MiniCourseCard
                key={course.slug}
                course={course}
                imageAlt={imageAlt}
                index={index}
                priority={index < 3}
              />
            ))}
          </div>
        ) : (
          <div className="container-luxe">
            <p className="text-bone-dim">به‌زودی مینی‌دوره‌های جدید اضافه می‌شوند.</p>
          </div>
        )}
      </section>

      <section className="py-section">
        <div className="container-luxe">
          <div className="neon-cta-slab rounded-card border border-emerald/25 bg-gradient-to-b from-emerald-deep/35 via-charcoal/65 to-ink p-6 sm:p-8 md:p-14">
            <Eyebrow>قدم بعدی</Eyebrow>
            <h2 className="mt-4 text-h2 text-balance md:mt-5">می‌خواهی عمیق‌تر بروی؟</h2>
            <p className="mt-4 max-w-2xl text-bone-dim md:mt-5">
              مینی‌دوره‌ها برای شروع‌اند؛ عمق در دوره‌ی اصلی است.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4 md:mt-10">
              <LinkButton href="/course/campaign-writing" variant="primary" size="lg" withArrow>
                ورود به دوره‌ی اصلی
              </LinkButton>
              <LinkButton href="/courses" variant="ghost" size="lg">
                همه‌ی دوره‌ها
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
