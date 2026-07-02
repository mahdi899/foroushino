"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote, TrendingUp, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { useEmeraldMetricIconClasses } from "@/lib/useAccentIconSurfaces";

import { sitePhotos } from "@/lib/site-photo-paths";

type T = {
  name: string;
  role: string;
  photo: string;
  photoAlt: string;
  pull: string;
  metrics: { icon: typeof Users; label: string; value: string }[];
};

const AUTO_ADVANCE_MS = 7000;

const testimonials: T[] = [
  {
    name: "سارا ر.",
    role: "مشاور کسب‌وکار",
    photo: sitePhotos.testimonialPortrait[0],
    photoAlt: "پرتره‌ی سارا - مشاور کسب‌وکار",
    pull:
      "برای اولین بار محتوایم مسیر پیوسته گرفت؛ سه ماه بعد، لیست انتظار.",
    metrics: [
      { icon: TrendingUp, label: "رشد دنبال‌کننده", value: "۴.۲×" },
      { icon: Wallet, label: "درآمد ماهانه", value: "۳.۸×" },
      { icon: Users, label: "لیست انتظار", value: "۹۰+" },
    ],
  },
  {
    name: "امیر ه.",
    role: "طراح تجربه",
    photo: sitePhotos.testimonialPortrait[1],
    photoAlt: "پرتره‌ی امیر - طراح تجربه",
    pull: "از پشت نمونه‌کارها بیرون آمدم؛ الان صدای حرفه‌ای خودم را می‌سازم.",
    metrics: [
      { icon: TrendingUp, label: "نقش رسانه‌ای", value: "۵×" },
      { icon: Users, label: "مخاطب فعال", value: "۱۸K+" },
      { icon: Wallet, label: "پروژه‌ها", value: "Premium" },
    ],
  },
  {
    name: "نازنین ک.",
    role: "مربی تغذیه",
    photo: sitePhotos.testimonialPortrait[2],
    photoAlt: "پرتره‌ی نازنین - مربی تغذیه",
    pull: "از جلسات تک‌نفره به گروه‌های پر رسیدم؛ کمپین برایم ساختار شد.",
    metrics: [
      { icon: TrendingUp, label: "ظرفیت گروه", value: "۶×" },
      { icon: Wallet, label: "فروش فصلی", value: "۴.۵×" },
      { icon: Users, label: "لیست انتظار", value: "۳ماه" },
    ],
  },
];

export function BigTestimonial() {
  const [index, setIndex] = useState(0);
  const [pauseAuto, setPauseAuto] = useState(false);
  const reduce = useReducedMotion();
  const t = testimonials[index]!;
  const metricIconMobile = useEmeraldMetricIconClasses("mobile");
  const metricIconDesktop = useEmeraldMetricIconClasses("desktop");

  const goto = (n: number) => {
    setIndex((n + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    if (reduce || pauseAuto) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % testimonials.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [reduce, pauseAuto]);

  return (
    <section
      className="relative isolate overflow-hidden py-section-sm md:py-section"
      onMouseEnter={() => setPauseAuto(true)}
      onMouseLeave={() => setPauseAuto(false)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_80%_10%,rgba(47,176,127,0.12),transparent_70%),radial-gradient(50%_40%_at_10%_90%,rgba(197,164,107,0.11),transparent_70%)]"
      />
      <div className="container-luxe relative">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div>
            <Reveal>
              <Eyebrow>نظر دانشجوها</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-3 max-w-3xl text-h2 text-balance md:mt-4">صدای کسانی که مسیر را جدی گرفتند.</h2>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <div className="hidden items-center justify-end gap-3 lg:flex">
              <span className="text-caption text-mist num-latin tabular-nums">
                {String(index + 1).padStart(2, "0")} / {String(testimonials.length).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2">
                <NavBtn ariaLabel="قبلی" onClick={() => goto(index - 1)}>
                  <ArrowRight className="rtl-flip h-4 w-4" aria-hidden />
                </NavBtn>
                <NavBtn ariaLabel="بعدی" onClick={() => goto(index + 1)}>
                  <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
                </NavBtn>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="mt-6 md:mt-8 lg:hidden">
          <AnimatePresence mode="wait">
            <motion.article
              key={t.name + "-mobile"}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="flex gap-4 sm:items-center sm:gap-5">
                <div className="w-[6.75rem] shrink-0 sm:w-[7.25rem]">
                  <PhotoFrame
                    ratio="square"
                    variant="radial"
                    rounded="card"
                    src={t.photo}
                    alt={t.photoAlt}
                    photoCaption="none"
                    showIcon={false}
                    className="border-bone/10 shadow-none"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <p className="font-display text-base font-semibold leading-snug text-balance text-bone sm:text-lg">
                    {t.name}
                  </p>
                  <p className="text-[0.8125rem] leading-snug text-mist">{t.role}</p>
                  <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-pill border border-gold/20 bg-gold/[0.06] px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-gold">
                    <Quote className="h-3 w-3" strokeWidth={1.6} aria-hidden />
                    تجربه
                  </span>
                </div>
              </div>

              <blockquote className="mt-5 border-t border-bone/10 pt-5 font-display text-[1.0625rem] font-medium leading-[1.65] text-balance text-bone sm:text-lg sm:leading-relaxed">
                «{t.pull}»
              </blockquote>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {t.metrics.map((m) => (
                  <div
                    key={t.name + m.label}
                    className="rounded-xl border border-bone/[0.07] bg-transparent p-2.5 sm:p-3"
                  >
                    <span className={metricIconMobile}>
                      <m.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.6} aria-hidden />
                    </span>
                    <p className="mt-2 font-display text-base font-semibold leading-none tabular-nums text-bone num-latin sm:text-lg">
                      {m.value}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[0.65rem] leading-snug text-mist sm:text-caption">
                      {m.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-2 border-t border-bone/10 pt-4">
                <NavBtn ariaLabel="نظر قبلی" onClick={() => goto(index - 1)}>
                  <ArrowRight className="rtl-flip h-4 w-4" aria-hidden />
                </NavBtn>
                <div className="flex flex-1 justify-center gap-2 px-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`نمایش نظر ${i + 1}`}
                      className={
                        "h-2 rounded-full transition-all duration-500 " +
                        (i === index ? "w-7 bg-emerald-glow" : "w-2 bg-bone/20 hover:bg-bone/35")
                      }
                    />
                  ))}
                </div>
                <NavBtn ariaLabel="نظر بعدی" onClick={() => goto(index + 1)}>
                  <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
                </NavBtn>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        <div className="mt-8 hidden items-center gap-8 md:mt-14 md:gap-10 lg:grid lg:grid-cols-12 lg:gap-14">
          {/* Portrait */}
          <div className="lg:col-span-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={t.name + "-photo"}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <PhotoFrame
                  ratio="portrait"
                  variant="radial"
                  rounded="card-lg"
                  label={t.name}
                  badge={t.role}
                  src={t.photo}
                  alt={t.photoAlt}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Quote + metrics */}
          <div className="lg:col-span-7">
            <Badge tone="gold">
              <Quote className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
              نقل‌قول کلیدی
            </Badge>
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={t.name + "-quote"}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 font-display text-xl font-medium text-balance leading-relaxed text-bone md:text-2xl"
              >
                «{t.pull}»
              </motion.blockquote>
            </AnimatePresence>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <AnimatePresence>
                {t.metrics.map((m, i) => (
                  <motion.div
                    key={t.name + m.label}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                    className="neon-surface-static rounded-card border border-bone/10 bg-charcoal/45 p-5"
                  >
                    <span className={metricIconDesktop}>
                      <m.icon className="h-4 w-4" strokeWidth={1.6} aria-hidden />
                    </span>
                    <p className="mt-4 font-display text-h3 leading-none text-bone num-latin">
                      {m.value}
                    </p>
                    <p className="mt-2 text-caption text-mist">{m.label}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-10 flex items-center gap-3">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`نمایش نظر ${i + 1}`}
                  className={
                    "h-1.5 rounded-full transition-all duration-500 " +
                    (i === index ? "w-8 bg-emerald-glow" : "w-3 bg-bone/15 hover:bg-bone/30")
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NavBtn({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-bone/15 bg-charcoal/55 text-bone-dim transition-colors hover:border-bone/30 hover:text-bone"
    >
      {children}
    </button>
  );
}
