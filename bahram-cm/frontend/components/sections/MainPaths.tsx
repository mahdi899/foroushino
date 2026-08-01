"use client";

import { PencilLine, Phone, Radio } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PathCard } from "@/components/sections/PathCard";
import { sitePhotos } from "@/lib/site-photo-paths";

const pathMeta: Record<
  string,
  {
    icon: LucideIcon;
    tone: "gold" | "teal";
    image: string;
    imageAlt: string;
    imageClassName?: string;
  }
> = {
  "/course/campaign-writing": {
    icon: PencilLine,
    tone: "gold",
    image: sitePhotos.mainPathCampaign,
    imageAlt: "کارت مسیر کمپین‌نویسی — کمپین نویسی با درآمد ۲۱ تا ۸۰ میلیون",
  },
  "/saat#apply": {
    icon: Phone,
    tone: "teal",
    image: sitePhotos.mainPathSaat,
    imageAlt: "کارت مسیر سات — انقلابی در فروش تلفنی",
    imageClassName: "object-[center_35%]",
  },
  "/saat": {
    icon: Phone,
    tone: "teal",
    image: sitePhotos.mainPathSaat,
    imageAlt: "کارت مسیر سات — انقلابی در فروش تلفنی",
    imageClassName: "object-[center_35%]",
  },
  "/reference-channels/kanal-mrgf": {
    icon: Radio,
    tone: "gold",
    image: sitePhotos.mainPathReference,
    imageAlt: "کارت کانال مرجع — محصول آماده، آموزش فروش و درآمد مستقیم",
    imageClassName: "object-[center_30%]",
  },
};

export function MainPaths({
  pathOverrides = {},
}: {
  pathOverrides?: {
    images?: Record<string, string>;
    imagesMobile?: Record<string, string>;
  };
}) {
  const pathImages = pathOverrides.images ?? {};
  const pathImagesMobile = pathOverrides.imagesMobile ?? {};

  const items = site.mainPaths.items.map((item) => {
    const meta = pathMeta[item.href] ?? pathMeta["/saat"]!;
    const image = pathImages[item.href] ?? meta.image;
    return {
      ...item,
      ...meta,
      image,
      imageMobile: pathImagesMobile[item.href] ?? image,
    };
  });

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

        <div className="relative mt-8 grid items-stretch gap-4 md:mt-10 md:grid-cols-2 md:gap-5 lg:gap-6">
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
