import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { BigTestimonial } from "@/components/sections/BigTestimonial";
import { CampaignScrollStory } from "@/components/sections/CampaignScrollStory";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { FounderAside } from "@/components/sections/FounderAside";
import { HeroCinematic } from "@/components/sections/HeroCinematic";
import { MainPaths } from "@/components/sections/MainPaths";
import { AcademyTeaser } from "@/components/sections/AcademyTeaser";
import { ManifestoShift } from "@/components/sections/ManifestoShift";

export const metadata: Metadata = buildMetadata({
  title: "مسیر رشد حرفه‌ای",
  description: "مسیر کمپین‌نویسی و سات — سیستم فروش تلفنی بهرام رستمی.",
  path: "/",
});

export default function HomePage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <HeroCinematic />
      <ManifestoShift />
      <MainPaths />
      <CampaignScrollStory />
      <BigTestimonial />
      <AcademyTeaser />
      <FounderAside />
      <FinalCTA />
    </main>
  );
}
