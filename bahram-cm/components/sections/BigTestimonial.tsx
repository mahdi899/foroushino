"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
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

        <div className="mt-5 grid gap-3 lg:mt-6 lg:grid-cols-12 lg:items-stretch lg:gap-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={featured.slug}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="student-result-featured overflow-hidden rounded-card-lg lg:col-span-8 lg:min-h-[12rem]"
            >
              <div className="flex h-full min-h-[11.5rem] sm:min-h-[12rem]">
                <div className="student-result-featured-media relative w-[52%] max-w-[22rem] shrink-0 overflow-hidden sm:max-w-[24rem]">
                  <Image
                    src={featured.photo}
                    alt={`پرتره ${featured.name}`}
                    fill
                    priority
                    className="object-cover object-top"
                    sizes="(max-width: 640px) 52vw, 384px"
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

                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
                  <blockquote className="font-display text-sm font-medium leading-relaxed text-balance text-bone sm:text-base">
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

          <div className="flex gap-2 overflow-x-auto pb-1 lg:col-span-4 lg:h-auto lg:min-h-[12rem] lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0">
            {results.map((item, index) => {
              const isActive = index === active;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-current={isActive ? "true" : undefined}
                  className={
                    "student-result-picker group relative flex min-w-[13.5rem] shrink-0 items-center gap-2.5 overflow-hidden rounded-card p-2.5 text-start transition-[transform,box-shadow,border-color,opacity] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-glow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink lg:min-h-0 lg:min-w-0 lg:flex-1 lg:gap-3 lg:p-2.5 " +
                    (isActive
                      ? "student-result-picker--active opacity-100"
                      : "opacity-88 hover:-translate-y-0.5 hover:opacity-100")
                  }
                >
                  <div className="relative h-[3.5rem] w-[2.875rem] shrink-0 overflow-hidden rounded-[0.75rem] lg:h-full lg:max-h-[4.25rem] lg:w-[3.5rem]">
                    <Image
                      src={item.photo}
                      alt=""
                      fill
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes="80px"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-bone">{item.name}</p>
                    <p className="mt-0.5 truncate text-caption text-mist">{item.role}</p>
                    <p className="mt-1.5 font-display text-sm font-semibold text-gold num-latin">
                      {item.metric.value}
                      <span className="me-1.5 text-caption font-normal text-mist">
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
