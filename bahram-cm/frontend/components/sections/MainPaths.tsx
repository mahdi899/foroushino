"use client";

import { PencilLine, Phone } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PathCard } from "@/components/sections/PathCard";
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
