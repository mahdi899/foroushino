"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, PencilLine, Phone } from "lucide-react";
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
    tone: "sales" as const,
    image: sitePhotos.landscapeSession,
    imageAlt: "نشست فروش و تماس تلفنی",
  },
] as const;

export function MainPaths() {
  const items = site.mainPaths.items.map((item, i) => ({
    ...item,
    ...pathMeta[i]!,
  }));

  return (
    <section
      aria-labelledby="main-paths-heading"
      className="relative isolate overflow-hidden pt-4 pb-section-sm md:pt-6 md:pb-section lg:pt-8"
    >
      <div className="container-luxe relative">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-8">
          <div className="min-w-0">
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
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-md text-sm text-bone-dim md:text-end md:text-body">
              {site.mainPaths.lead}
            </p>
          </Reveal>
        </div>

        <div className="mt-6 grid items-stretch gap-4 md:mt-7 md:grid-cols-2 md:gap-5 lg:mt-8 lg:gap-6">
          {items.map((path, i) => (
            <Reveal key={path.href} delay={0.12 + i * 0.06} className="h-full">
              <PathCard {...path} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
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
  tone: "gold" | "sales";
  image: string;
  imageAlt: string;
}) {
  return (
    <Link
      href={href}
      data-path-tone={tone}
      className="main-path-card group relative grid h-full min-h-[15.5rem] overflow-hidden rounded-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-glow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink max-md:grid-rows-[auto_1fr] md:min-h-[13.75rem] md:grid-cols-[minmax(13rem,47%)_minmax(0,1fr)] lg:min-h-[14.5rem]"
    >
      <span
        aria-hidden
        className={cn(
          "main-path-card-accent pointer-events-none absolute inset-y-0 start-0 z-[2] w-[3px]",
          tone === "gold" ? "bg-gold" : "bg-sales",
        )}
      />

      <div className="main-path-card-media relative h-[8.25rem] overflow-hidden max-md:w-full md:h-full md:min-h-[13.75rem] lg:min-h-[14.5rem]">
        <Image
          src={image}
          alt={imageAlt}
          fill
          className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.05]"
          sizes="(max-width: 767px) 100vw, 320px"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-l from-black/10 via-black/28 to-black/48 md:bg-gradient-to-t md:from-black/55 md:via-black/22 md:to-transparent"
        />
      </div>

      <div className="main-path-card-body flex min-w-0 flex-col justify-between gap-4 p-5 md:py-6 md:pe-5 md:ps-6 lg:p-6">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border backdrop-blur-sm",
                tone === "gold"
                  ? "border-gold/25 bg-gold/12 text-gold"
                  : "border-sales/25 bg-sales/12 text-sales",
              )}
            >
              <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.65} aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <h3 className="font-display text-lg font-semibold leading-tight text-bone lg:text-[1.35rem]">
                {label}
              </h3>
              <p className="mt-2 text-sm font-medium leading-snug text-bone">{tagline}</p>
              <p className="mt-1.5 text-caption leading-relaxed text-bone-dim">{description}</p>
            </div>
          </div>
        </div>

        <div className="main-path-card-footer flex justify-end border-t border-bone/8 pt-4">
          <span className="main-path-card-cta inline-flex shrink-0 items-center gap-2 rounded-pill px-3.5 py-2 text-caption font-semibold md:gap-2.5 md:px-4 md:py-2.5">
            <span>{cta}</span>
            <ArrowLeft className={liveIconArrow("h-3.5 w-3.5")} strokeWidth={2.2} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
