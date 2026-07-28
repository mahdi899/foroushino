"use client";

import { GraduationCap, PencilLine, Phone, Radio } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { PathCard } from "@/components/sections/PathCard";
import type { CourseCatalogCard } from "@/lib/catalog/courseListings";

const catalogMeta: Record<string, { icon: LucideIcon; tone: "gold" | "teal" }> = {
  "/course/campaign-writing": { icon: PencilLine, tone: "gold" },
  "/saat": { icon: Phone, tone: "teal" },
  "/saat#apply": { icon: Phone, tone: "teal" },
  "/reference-channels/kanal-mrgf": { icon: Radio, tone: "gold" },
};

function isReferenceChannelHref(href: string): boolean {
  return href.startsWith("/reference-channels/");
}

function CatalogCard({
  course,
  delay,
}: {
  course: CourseCatalogCard;
  delay: number;
}) {
  const meta = catalogMeta[course.href] ?? {
    icon: GraduationCap,
    tone: "teal" as const,
  };
  const siteTagline = site.mainPaths.items.find((item) => item.href === course.href)?.tagline;

  return (
    <Reveal delay={delay} className="h-full">
      <PathCard
        href={course.href}
        label={course.label}
        tagline={siteTagline ?? course.tagline}
        cta={course.cta}
        icon={meta.icon}
        tone={meta.tone}
        image={course.image}
        imageAlt={course.imageAlt}
        featured={course.featured}
        level={course.level}
        duration={course.duration}
      />
    </Reveal>
  );
}

export function CourseCatalogGrid({ courses }: { courses: CourseCatalogCard[] }) {
  const primary = courses.filter((course) => !isReferenceChannelHref(course.href));
  const secondary = courses.filter((course) => isReferenceChannelHref(course.href));

  return (
    <div className="flex flex-col gap-4 md:gap-5 lg:gap-6">
      <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
        {primary.map((course, i) => (
          <CatalogCard key={course.href} course={course} delay={0.08 + i * 0.06} />
        ))}
      </div>

      {secondary.length > 0 ? (
        <div className="mx-auto w-full max-w-3xl">
          {secondary.map((course, i) => (
            <CatalogCard
              key={course.href}
              course={course}
              delay={0.08 + (primary.length + i) * 0.06}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
