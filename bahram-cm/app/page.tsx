import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { BigTestimonial } from "@/components/sections/BigTestimonial";
import { CampaignScrollStory } from "@/components/sections/CampaignScrollStory";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { FounderAside } from "@/components/sections/FounderAside";
import { HeroCinematic } from "@/components/sections/HeroCinematic";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { InstagramBand } from "@/components/sections/InstagramBand";
import { AcademyTeaser } from "@/components/sections/AcademyTeaser";
import { ManifestoShift } from "@/components/sections/ManifestoShift";

export const metadata: Metadata = buildMetadata({
  title: "مسیر رشد حرفه‌ای",
  description: "مسیر کمپین‌نویسی و ورود به آکادمی — بهرام رستمی.",
  path: "/",
});

export default function HomePage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <HeroCinematic />
      <ManifestoShift />
      <HowItWorks />
      <CampaignScrollStory />
      <BigTestimonial />
      <AcademyTeaser />
      <InstagramBand />
      <FounderAside />
      <FinalCTA />
    </main>
  );
}
