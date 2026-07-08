import dynamic from 'next/dynamic';
import { HeroCinematic } from '@/components/sections/HeroCinematic';
import { MainPaths } from '@/components/sections/MainPaths';
import { CampaignScrollStory } from '@/components/sections/CampaignScrollStory';
import { BigTestimonial } from '@/components/sections/BigTestimonial';
import { AcademyTeaser } from '@/components/sections/AcademyTeaser';
import { FounderAside } from '@/components/sections/FounderAside';
import { FinalCTA } from '@/components/sections/FinalCTA';

const CampaignScrollStoryLazy = dynamic(() =>
  import('@/components/sections/CampaignScrollStory').then((m) => ({ default: m.CampaignScrollStory })),
);
const BigTestimonialLazy = dynamic(() =>
  import('@/components/sections/BigTestimonial').then((m) => ({ default: m.BigTestimonial })),
);
const AcademyTeaserLazy = dynamic(() =>
  import('@/components/sections/AcademyTeaser').then((m) => ({ default: m.AcademyTeaser })),
);
const FounderAsideLazy = dynamic(() =>
  import('@/components/sections/FounderAside').then((m) => ({ default: m.FounderAside })),
);
const FinalCTALazy = dynamic(() =>
  import('@/components/sections/FinalCTA').then((m) => ({ default: m.FinalCTA })),
);

export function HomeBelowFoldSections({ deferBelowFold }: { deferBelowFold: boolean }) {
  const Campaign = deferBelowFold ? CampaignScrollStoryLazy : CampaignScrollStory;
  const Testimonial = deferBelowFold ? BigTestimonialLazy : BigTestimonial;
  const Academy = deferBelowFold ? AcademyTeaserLazy : AcademyTeaser;
  const Founder = deferBelowFold ? FounderAsideLazy : FounderAside;
  const CTA = deferBelowFold ? FinalCTALazy : FinalCTA;

  return (
    <main id="main-content" className="relative isolate min-w-0 w-full max-w-full overflow-x-clip">
      <HeroCinematic />
      <MainPaths />
      <Campaign />
      <Testimonial />
      <Academy />
      <Founder />
      <CTA />
    </main>
  );
}
