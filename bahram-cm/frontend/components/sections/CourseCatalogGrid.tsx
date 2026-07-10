"use client";

import { GraduationCap, PencilLine, Phone } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { PathCard } from "@/components/sections/PathCard";
import type { CourseCatalogCard } from "@/lib/catalog/courseListings";

const catalogMeta: Record<
  string,
  { icon: typeof PencilLine; tone: "gold" | "teal" }
> = {
  "/course/campaign-writing": { icon: PencilLine, tone: "gold" },
  "/saat": { icon: Phone, tone: "teal" },
};

export function CourseCatalogGrid({ courses }: { courses: CourseCatalogCard[] }) {
  return (
    <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
      {courses.map((course, i) => {
        const meta = catalogMeta[course.href] ?? {
          icon: GraduationCap,
          tone: "teal" as const,
        };
        const siteTagline = site.mainPaths.items.find((item) => item.href === course.href)?.tagline;

        return (
          <Reveal key={course.href} delay={0.08 + i * 0.06} className="h-full">
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
      })}
    </div>
  );
}
