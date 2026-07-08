import type { Metadata } from "next";
import { SiteImage } from "@/components/ui/SiteImage";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  FileText,
  Layers3,
  PenLine,
  Sparkles,
  Target,
} from "lucide-react";
import { PageHero } from "@/components/blocks/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IconTile } from "@/components/ui/IconTile";
import { buildMetadata } from "@/lib/seo";
import { sitePhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "مینی‌دوره‌ها",
  description: "مسیرهای کوتاه برای ورود سریع به تفکر کمپین‌محور؛ نقطه‌ی شروع قبل از مسیر اصلی.",
  path: "/mini-courses",
});

const miniCourses = [
  {
    icon: PenLine,
    title: "پیام یک‌خطی برند",
    duration: "۹۰ دقیقه",
    level: "مقدماتی",
    body: "پیام مرکزی واضح، متمایز، تکرارپذیر.",
    image: sitePhotos.manifestoLandscape,
    imageAlt: "فضای کار خلاق برای تعریف پیام برند",
    href: "/courses/message-foundations",
  },
  {
    icon: Target,
    title: "کمپین ۷ روزه",
    duration: "۲ ساعت",
    level: "میانی",
    body: "طراحی و اجرای کمپین کوتاه با اسکلت آماده.",
    image: sitePhotos.storyStep[0]!,
    imageAlt: "تیم در جلسه برنامه‌ریزی کمپین",
    href: "/courses/launch-playbook",
  },
  {
    icon: FileText,
    title: "صفحه‌ی فروش روایی",
    duration: "۱۲۰ دقیقه",
    level: "میانی",
    body: "صفحه‌ای که از آگاهی تا اقدام هدایت می‌کند.",
    image: sitePhotos.storyStep[1]!,
    imageAlt: "طراحی و چیدمان محتوا روی نمایشگر",
    href: "/courses/sales-conversations",
  },
  {
    icon: Layers3,
    title: "معماری روایت",
    duration: "۷۵ دقیقه",
    level: "مقدماتی",
    body: "زاویه، رویداد، تبدیل — سه لایه روایت.",
    image: sitePhotos.storyStep[2]!,
    imageAlt: "ساختار و لایه‌بندی برای روایت برند",
    href: "/courses/storytelling-for-brands",
  },
  {
    icon: Sparkles,
    title: "آغازگرها",
    duration: "۶۰ دقیقه",
    level: "مقدماتی",
    body: "۱۱ شروعِ کوتاه برای ۸ ثانیه‌ی اول.",
    image: sitePhotos.social[0]!,
    imageAlt: "فضای ایده‌پردازی و شروع خلاقانه",
    href: "/courses/content-system",
  },
  {
    icon: Clock,
    title: "ریتم کمپین",
    duration: "۹۵ دقیقه",
    level: "میانی",
    body: "زمان‌بندی، فاصله‌ها، اوج‌های کمپین.",
    image: sitePhotos.storyStep[3]!,
    imageAlt: "هماهنگی زمان‌بندی در اجرای کمپین",
    href: "/courses/launch-playbook",
  },
];

export default function MiniCoursesPage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Mini Courses"
        title="مینی‌دوره‌ها"
        description="مسیرهای کوتاه برای ورود سریع؛ نقطه‌ی شروع قبل از مسیر اصلی."
      />
      <section className="py-section-sm">
        <div className="container-luxe grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {miniCourses.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.05}>
              <Link
                href={item.href}
                data-neon-tone={i % 2 === 0 ? "emerald" : "gold"}
                className="neon-surface-hover group relative flex h-full flex-col overflow-hidden rounded-card border border-bone/10 bg-charcoal/55 transition-colors hover:border-bone/25"
              >
                <div className="relative aspect-[16/10] shrink-0 overflow-hidden">
                  <SiteImage
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
                    priority={i < 3}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
                  <div className="absolute start-4 top-4">
                    <IconTile
                      icon={item.icon}
                      tone={i % 2 === 0 ? "emerald" : "gold"}
                      size="sm"
                    />
                  </div>
                  <div className="absolute end-4 top-4">
                    <Badge>{item.level}</Badge>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5 md:p-6">
                  <h2 className="text-h3 text-balance text-bone">{item.title}</h2>
                  <p className="mt-3 grow text-bone-dim">{item.body}</p>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-bone/8 pt-5">
                    <Chip>
                      <Clock className="me-1.5 h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      {item.duration}
                    </Chip>
                    <span className="inline-flex items-center gap-1.5 text-caption text-gold">
                      مشاهده‌ی دوره
                      <ArrowLeft
                        className="rtl-flip h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-section">
        <div className="container-luxe">
          <div className="neon-cta-slab rounded-card border border-emerald/25 bg-gradient-to-b from-emerald-deep/35 via-charcoal/65 to-ink p-6 sm:p-8 md:p-14">
            <Eyebrow>قدم بعدی</Eyebrow>
            <h2 className="mt-4 text-h2 text-balance md:mt-5">می‌خواهی عمیق‌تر بروی؟</h2>
            <p className="mt-4 max-w-2xl text-bone-dim md:mt-5">
              برای شروع‌اند؛ عمق در دوره‌ی اصلی است.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4 md:mt-10">
              <LinkButton href="/course/campaign-writing" variant="primary" size="lg" withArrow>
                ورود به دوره‌ی اصلی
              </LinkButton>
              <LinkButton href="/courses" variant="ghost" size="lg">
                همه‌ی دوره‌ها
              </LinkButton>
              <Link
                href="/saat"
                className="inline-flex items-center gap-2 text-gold transition-colors hover:text-gold-soft"
              >
                آشنایی با سات
                <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
