import dynamic from 'next/dynamic';
import { HeroCinematic } from '@/components/sections/HeroCinematic';
import { MainPaths } from '@/components/sections/MainPaths';
import { SectionReveal } from '@/components/motion/SectionReveal';
import { getCoursePathOverrides } from '@/lib/catalog/courseListings';

const SectionFallback = () => (
  <div className="min-h-[40vh] animate-pulse bg-surface-muted/30" aria-hidden />
);

const CampaignScrollStoryLazy = dynamic(
  () => import('@/components/sections/CampaignScrollStory').then((m) => ({ default: m.CampaignScrollStory })),
  { loading: SectionFallback },
);
const BigTestimonialLazy = dynamic(
  () => import('@/components/sections/BigTestimonial').then((m) => ({ default: m.BigTestimonial })),
  { loading: SectionFallback },
);
const AcademyTeaserLazy = dynamic(
  () => import('@/components/sections/AcademyTeaser').then((m) => ({ default: m.AcademyTeaser })),
  { loading: SectionFallback },
);
const FounderAsideLazy = dynamic(
  () => import('@/components/sections/FounderAside').then((m) => ({ default: m.FounderAside })),
  { loading: SectionFallback },
);
const FinalCTALazy = dynamic(
  () => import('@/components/sections/FinalCTA').then((m) => ({ default: m.FinalCTA })),
  { loading: SectionFallback },
);

const CampaignScrollStory = CampaignScrollStoryLazy;
const BigTestimonial = BigTestimonialLazy;
const AcademyTeaser = AcademyTeaserLazy;
const FounderAside = FounderAsideLazy;
const FinalCTA = FinalCTALazy;

export async function HomeBelowFoldSections({ deferBelowFold }: { deferBelowFold: boolean }) {
  const { images: pathImages } = await getCoursePathOverrides();
  const Campaign = deferBelowFold ? CampaignScrollStoryLazy : CampaignScrollStory;
  const Testimonial = deferBelowFold ? BigTestimonialLazy : BigTestimonial;
  const Academy = deferBelowFold ? AcademyTeaserLazy : AcademyTeaser;
  const Founder = deferBelowFold ? FounderAsideLazy : FounderAside;
  const CTA = deferBelowFold ? FinalCTALazy : FinalCTA;

  return (
    <main id="main-content" className="relative isolate min-w-0 w-full max-w-full overflow-x-clip">
      <HeroCinematic />
      <SectionReveal>
        <MainPaths pathOverrides={{ images: pathImages }} />
      </SectionReveal>
      <SectionReveal>
        <Campaign />
      </SectionReveal>
      <SectionReveal>
        <Testimonial />
      </SectionReveal>
      <SectionReveal>
        <Academy />
      </SectionReveal>
      <SectionReveal>
        <Founder />
      </SectionReveal>
      <SectionReveal>
        <CTA />
      </SectionReveal>
    </main>
  );
}
