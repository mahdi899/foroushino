"use client";

import { SiteImage } from "@/components/ui/SiteImage";
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
    label: "کمپین نویسی",
    tagline: "درآمد ۲۱ تا ۸۰ میلیون",
    image: sitePhotos.mainPathCampaign,
    imageAlt: "کارت مسیر کمپین‌نویسی — کمپین نویسی با درآمد ۲۱ تا ۸۰ میلیون",
  },
  {
    icon: Phone,
    tone: "teal" as const,
    label: "سات",
    tagline: "انقلابی در فروش تلفنی",
    image: sitePhotos.mainPathSaat,
    imageAlt: "کارت مسیر سات — انقلابی در فروش تلفنی",
  },
] as const;

export function MainPaths({
  pathOverrides = {},
}: {
  pathOverrides?: {
    images?: Record<string, string>;
  };
}) {
  const pathImages = pathOverrides.images ?? {};

  const items = site.mainPaths.items.map((item, i) => ({
    ...item,
    ...pathMeta[i]!,
    image: pathImages[item.href] ?? pathMeta[i]!.image,
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
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow className="justify-center">{site.mainPaths.eyebrow}</Eyebrow>
          </Reveal>
          <Reveal delay={0.06}>
            <h2
              id="main-paths-heading"
              className="mx-auto mt-2 max-w-xl text-balance font-display text-xl text-bone md:mt-2.5 md:text-h3"
            >
              {site.mainPaths.title}
            </h2>
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
        </div>
      </div>
    </section>
  );
}

function PathCard({
  href,
  label,
  tagline,
  cta,
  icon: Icon,
  tone,
  image,
  imageAlt,
}: {
  href: string;
  label: string;
  tagline: string;
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
      className="main-path-card group relative flex min-h-0 flex-col overflow-hidden rounded-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-glow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink md:block md:min-h-[22.5rem] lg:min-h-[23.5rem]"
    >
      <div className="main-path-card-media relative aspect-[16/13] max-h-[min(73vw,15.75rem)] w-full overflow-hidden sm:max-h-[17.875rem] md:absolute md:inset-y-0 md:end-0 md:aspect-auto md:max-h-none md:w-[48%] lg:w-[46%]">
        <SiteImage
          src={image}
          alt={imageAlt}
          fill
          className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.05]"
          sizes="(max-width: 767px) 50vw, 280px"
        />
      </div>

      <div className="main-path-card-body relative z-[1] flex flex-1 flex-col justify-between gap-5 p-5 md:min-h-[22.5rem] md:p-6 md:pe-[50%] lg:min-h-[23.5rem] lg:p-7 lg:pe-[48%]">
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
          <h3 className="mt-4 font-display text-[1.65rem] font-bold leading-[1.12] tracking-[-0.02em] text-bone md:text-[1.85rem] lg:text-[2.125rem]">
            {label}
          </h3>
          <p
            className={cn(
              "mt-2.5 text-xl font-bold leading-snug tracking-[-0.01em] md:text-[1.35rem] lg:text-2xl",
              tone === "gold" ? "text-gold" : "text-emerald-glow",
            )}
          >
            {tagline}
          </p>
        </div>

        <div className="flex justify-start">
          <span className="main-path-card-cta inline-flex min-h-11 min-w-[10.5rem] shrink-0 items-center justify-center gap-2.5 rounded-pill px-6 py-3 text-sm font-semibold transition-[background,box-shadow,transform] duration-300 ease-[var(--ease-luxe)] md:min-h-12 md:min-w-[12.5rem] md:gap-3 md:px-8 md:text-body">
            <span>{cta}</span>
            <ArrowLeft className={liveIconArrow("h-4 w-4")} strokeWidth={2.2} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
