"use client";

import { GraduationCap, PencilLine, Phone, Radio } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { PathCard } from "@/components/sections/PathCard";
import type { CourseCatalogCard } from "@/lib/catalog/courseListings";

const catalogMeta: Record<
  string,
  { icon: LucideIcon; tone: "gold" | "teal"; imageClassName?: string }
> = {
  "/course/campaign-writing": { icon: PencilLine, tone: "gold" },
  "/saat": { icon: Phone, tone: "teal", imageClassName: "object-[center_20%]" },
  "/saat#apply": { icon: Phone, tone: "teal", imageClassName: "object-[center_20%]" },
  "/reference-channels/kanal-mrgf": {
    icon: Radio,
    tone: "gold",
    imageClassName: "object-[center_22%]",
  },
};

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
        imageMobile={course.imageMobile}
        imageAlt={course.imageAlt}
        imageClassName={meta.imageClassName}
        featured={course.featured}
        level={course.level}
        duration={course.duration}
      />
    </Reveal>
  );
}

export function CourseCatalogGrid({ courses }: { courses: CourseCatalogCard[] }) {
  return (
    <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
      {courses.map((course, i) => (
        <CatalogCard key={course.href} course={course} delay={0.08 + i * 0.06} />
      ))}
    </div>
  );
}
