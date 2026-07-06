"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SiteImage } from "@/components/ui/SiteImage";
import { useState } from "react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { caseStudyPortrait } from "@/lib/site-photo-paths";

type ResultItem = {
  slug: string;
  name: string;
  role: string;
  after: string;
  quote: string;
  metric: { value: string; label: string };
  photo: string;
};

const resultMeta = [
  {
    quote: "برای اولین بار محتوایم مسیر پیوسته گرفت؛ سه ماه بعد، لیست انتظار.",
    metric: { value: "۴.۲×", label: "درآمد ماهانه" },
  },
  {
    quote: "از پشت نمونه‌کارها بیرون آمدم؛ الان صدای حرفه‌ای خودم را می‌سازم.",
    metric: { value: "۵×", label: "نقش رسانه‌ای" },
  },
  {
    quote: "از جلسات تک‌نفره به گروه‌های پر رسیدم؛ کمپین برایم ساختار شد.",
    metric: { value: "۶×", label: "ظرفیت گروه" },
  },
  {
    quote: "سات فروش را برایم قابل پیگیری کرد؛ هر تماس یک قدم مشخص دارد.",
    metric: { value: "۳.۵×", label: "نرخ تبدیل" },
  },
] as const;

const results: ResultItem[] = site.transformations.map((item, i) => ({
  slug: item.slug,
  name: item.name,
  role: item.role,
  after: item.after,
  quote: resultMeta[i]!.quote,
  metric: resultMeta[i]!.metric,
  photo: caseStudyPortrait(item.slug),
}));

export function BigTestimonial() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const featured = results[active]!;

  return (
    <section
      aria-labelledby="student-results-heading"
      className="relative isolate overflow-hidden pt-10 pb-8 md:pt-12 md:pb-10 lg:pt-16"
    >
      <div className="container-luxe relative">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-6">
          <Reveal>
            <h2
              id="student-results-heading"
              className="max-w-xl text-balance font-display text-h3 text-bone md:text-h2"
            >
              {site.studentResults.title}
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="max-w-md text-sm text-bone-dim md:text-end md:text-body">
              {site.studentResults.lead}
            </p>
          </Reveal>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:mt-6 lg:flex-row lg:items-stretch lg:gap-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={featured.slug}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="student-result-featured flex min-h-[9.5rem] min-w-0 flex-[8] overflow-hidden rounded-card-lg sm:min-h-[10rem] lg:min-h-0"
            >
              <div className="flex h-full min-h-[9.5rem] w-full sm:min-h-[10rem]">
                <div className="student-result-featured-media relative w-[34%] max-w-[9.5rem] shrink-0 self-stretch overflow-hidden sm:max-w-[11rem] lg:max-w-[12rem]">
                  <SiteImage
                    src={featured.photo}
                    alt={`پرتره ${featured.name}`}
                    fallbackAlt={`پرتره ${featured.name}`}
                    fill
                    priority
                    className="object-cover object-top"
                    sizes="(max-width: 640px) 34vw, 192px"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-l from-black/45 via-black/15 to-transparent"
                  />
                  <span
                    aria-hidden
                    className="student-result-featured-accent pointer-events-none absolute inset-y-0 start-0 w-[3px]"
                  />
                </div>

                <div className="flex h-full min-w-0 flex-1 flex-col justify-between gap-3 p-4 sm:p-4 lg:p-5">
                  <blockquote className="flex-1 font-display text-[1.0625rem] font-normal leading-[1.75] text-balance text-bone sm:text-lg lg:text-[1.25rem] lg:leading-[1.7]">
                    «{featured.quote}»
                  </blockquote>

                  <div className="flex items-end justify-between gap-3 border-t border-bone/8 pt-3">
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold text-bone sm:text-base">
                        {featured.name}
                      </p>
                      <p className="mt-0.5 text-caption text-mist">{featured.role}</p>
                      <p className="mt-2 line-clamp-2 text-caption leading-snug text-emerald-glow">
                        {featured.after}
                      </p>
                    </div>
                    <div className="student-result-metric-highlight shrink-0 rounded-[0.875rem] px-3 py-2 text-end">
                      <p className="font-display text-xl font-semibold leading-none text-bone num-latin sm:text-2xl">
                        {featured.metric.value}
                      </p>
                      <p className="mt-1 text-caption text-bone-dim">{featured.metric.label}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.article>
          </AnimatePresence>

          <div
            role="listbox"
            aria-label="انتخاب دانشجو"
            className="grid h-full min-h-[9.5rem] min-w-0 flex-[4] grid-cols-2 grid-rows-2 gap-2 auto-rows-fr sm:min-h-[10rem] sm:gap-2.5 lg:min-h-0 lg:gap-2"
          >
            {results.map((item, index) => {
              const isActive = index === active;
              return (
                <button
                  key={item.slug}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => setActive(index)}
                  className={
                    "student-result-picker group relative flex h-full min-h-0 min-w-0 items-center gap-2 overflow-hidden rounded-card p-2 text-start transition-[transform,box-shadow,border-color,opacity] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-glow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:gap-2.5 sm:p-2.5 " +
                    (isActive
                      ? "student-result-picker--active opacity-100"
                      : "opacity-88 hover:-translate-y-0.5 hover:opacity-100")
                  }
                >
                  <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded-[0.65rem] sm:h-11 sm:w-9">
                    <SiteImage
                      src={item.photo}
                      alt={`پرتره ${item.name}`}
                      fallbackAlt={`پرتره ${item.name}`}
                      fill
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes="72px"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-xs font-semibold text-bone sm:text-sm">
                      {item.name}
                    </p>
                    <p className="mt-0.5 truncate text-[0.6875rem] text-mist sm:text-caption">
                      {item.role}
                    </p>
                    <p className="mt-1 font-display text-xs font-semibold text-gold num-latin sm:text-sm">
                      {item.metric.value}
                      <span className="me-1 text-[0.6875rem] font-normal text-mist sm:text-caption">
                        {item.metric.label}
                      </span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
