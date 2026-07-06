"use client";

import { SiteImage } from "@/components/ui/SiteImage";
import Link from "next/link";
import { ArrowLeft, PencilLine, Phone, Shield, Target, Zap } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { liveIconArrow } from "@/lib/iconMotion";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { sitePhotos } from "@/lib/site-photo-paths";

const pathMeta = [
  {
    icon: PencilLine,
    tone: "gold" as const,
    image: sitePhotos.courseBackstage,
    imageAlt: "پشت صحنه کمپین‌نویسی",
  },
  {
    icon: Phone,
    tone: "teal" as const,
    image: sitePhotos.landscapeSession,
    imageAlt: "نشست فروش و تماس تلفنی",
  },
] as const;

const trustIcons = [Shield, Target, Zap] as const;

export function MainPaths() {
  const items = site.mainPaths.items.map((item, i) => ({
    ...item,
    ...pathMeta[i]!,
  }));

  return (
    <section
      aria-labelledby="main-paths-heading"
      className="main-paths-section relative isolate overflow-hidden pt-4 pb-section-sm md:pt-6 md:pb-section lg:pt-8"
    >
      <div
        aria-hidden
        className="main-paths-section-ambient pointer-events-none absolute inset-x-0 bottom-0 h-[min(42vw,22rem)]"
      />

      <div className="container-luxe relative">
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>{site.mainPaths.eyebrow}</Eyebrow>
          </Reveal>
          <Reveal delay={0.06}>
            <h2
              id="main-paths-heading"
              className="mt-2 max-w-xl text-balance font-display text-h3 text-bone md:mt-2.5 md:text-h2"
            >
              {site.mainPaths.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-bone-dim md:text-body">
              {site.mainPaths.lead}
            </p>
          </Reveal>
        </div>

        <div className="relative mt-8 md:mt-10">
          <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
            {items.map((path, i) => (
              <Reveal key={path.href} delay={0.12 + i * 0.06} className="h-full">
                <PathCard {...path} />
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.24}>
            <MainPathsFork />
          </Reveal>

          <Reveal delay={0.28}>
            <ul
              dir="ltr"
              className="main-paths-trust mt-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:mt-3 md:gap-x-12"
            >
              {site.mainPaths.trust.map((item, i) => {
                const Icon = trustIcons[i]!;
                return (
                  <li key={item.label} className="inline-flex items-center gap-2.5 text-caption text-bone-dim">
                    <span className="main-paths-trust-icon inline-flex h-8 w-8 items-center justify-center rounded-full">
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span>{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function MainPathsFork() {
  return (
    <div aria-hidden className="main-paths-fork pointer-events-none relative mx-auto -mt-1 h-14 w-full max-w-[min(100%,42rem)] md:h-16">
      <svg
        viewBox="0 0 640 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="main-paths-fork-gold" x1="640" y1="0" x2="320" y2="72" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--color-gold)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--color-gold)" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="main-paths-fork-teal" x1="0" y1="0" x2="320" y2="72" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--color-emerald-glow)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--color-emerald-glow)" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <path
          d="M 72 4 C 140 8, 220 28, 320 64"
          stroke="url(#main-paths-fork-teal)"
          strokeWidth="1.5"
          className="main-paths-fork-arm"
        />
        <path
          d="M 568 4 C 500 8, 420 28, 320 64"
          stroke="url(#main-paths-fork-gold)"
          strokeWidth="1.5"
          className="main-paths-fork-arm"
        />
        <circle cx="320" cy="64" r="3.5" className="main-paths-fork-node-end" />
      </svg>
    </div>
  );
}

function PathCard({
  href,
  label,
  tagline,
  description,
  cta,
  icon: Icon,
  tone,
  image,
  imageAlt,
}: {
  href: string;
  label: string;
  tagline: string;
  description: string;
  cta: string;
  icon: typeof PencilLine;
  tone: "gold" | "teal";
  image: string;
  imageAlt: string;
}) {
  return (
    <Link
      href={href}
      data-path-tone={tone}
      className="main-path-card group relative block min-h-[17.5rem] overflow-hidden rounded-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-glow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink md:min-h-[15.5rem] lg:min-h-[16.25rem]"
    >
      <div className="main-path-card-media absolute inset-y-0 end-0 w-[min(52%,15.5rem)] sm:w-[min(54%,17rem)] md:w-[48%] lg:w-[46%]">
        <SiteImage
          src={image}
          alt={imageAlt}
          fill
          className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.05]"
          sizes="(max-width: 767px) 50vw, 280px"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/72 to-transparent"
        />
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 opacity-70 mix-blend-soft-light",
            tone === "gold"
              ? "bg-gradient-to-br from-gold/18 via-transparent to-transparent"
              : "bg-gradient-to-br from-emerald-glow/16 via-transparent to-transparent",
          )}
        />
      </div>

      <div className="main-path-card-body relative z-[1] flex min-h-[17.5rem] flex-col justify-between gap-5 p-5 pe-[42%] sm:pe-[44%] md:min-h-[15.5rem] md:p-6 md:pe-[50%] lg:min-h-[16.25rem] lg:p-7 lg:pe-[48%]">
        <div className="min-w-0">
          <span
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm",
              tone === "gold"
                ? "border-gold/30 bg-gold/10 text-gold shadow-[0_0_18px_-6px_rgba(255,176,0,0.45)]"
                : "border-emerald-glow/30 bg-emerald-glow/10 text-emerald-glow shadow-[0_0_18px_-6px_rgba(37,160,166,0.42)]",
            )}
          >
            <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.65} aria-hidden />
          </span>
          <h3 className="mt-4 font-display text-xl font-semibold leading-tight text-bone lg:text-[1.4rem]">
            {label}
          </h3>
          <p
            className={cn(
              "mt-2 text-sm font-semibold leading-snug",
              tone === "gold" ? "text-gold" : "text-emerald-glow",
            )}
          >
            {tagline}
          </p>
          <p className="mt-2 text-caption leading-relaxed text-bone-dim">{description}</p>
        </div>

        <div className="flex justify-start">
          <span className="main-path-card-cta inline-flex shrink-0 items-center gap-2 rounded-pill px-4 py-2.5 text-caption font-semibold md:gap-2.5 md:px-5">
            <span>{cta}</span>
            <ArrowLeft className={liveIconArrow("h-3.5 w-3.5")} strokeWidth={2.2} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
