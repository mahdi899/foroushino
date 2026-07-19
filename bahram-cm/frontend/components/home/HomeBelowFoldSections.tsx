import { Suspense, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { HeroCinematic } from '@/components/sections/HeroCinematic';
import { MainPaths } from '@/components/sections/MainPaths';
import { FamilyPulseSection } from '@/components/sections/FamilyPulseSection';
import { DeferredWhenVisible } from '@/components/performance/DeferredWhenVisible';
import { getCoursePathOverrides } from '@/lib/catalog/courseListings';

const SectionFallback = () => (
  <div className="min-h-[40vh] animate-pulse bg-surface-muted/30" aria-hidden />
);

const SectionReveal = dynamic(
  () => import('@/components/motion/SectionReveal').then((m) => ({ default: m.SectionReveal })),
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

function DeferredSection({
  defer,
  children,
  rootMargin = '480px 0px',
}: {
  defer: boolean;
  children: ReactNode;
  rootMargin?: string;
}) {
  if (!defer) return <>{children}</>;
  return (
    <DeferredWhenVisible fallback={<SectionFallback />} rootMargin={rootMargin}>
      {children}
    </DeferredWhenVisible>
  );
}

async function MainPathsSection() {
  const { images: pathImages } = await getCoursePathOverrides();

  return (
    <SectionReveal>
      <MainPaths pathOverrides={{ images: pathImages }} />
    </SectionReveal>
  );
}

export function HomeBelowFoldSections({ deferBelowFold = true }: { deferBelowFold?: boolean }) {
  return (
    <main id="main-content" className="relative isolate min-w-0 w-full max-w-full overflow-x-clip">
      <HeroCinematic />
      <DeferredSection defer={deferBelowFold} rootMargin="320px 0px">
        <SectionReveal>
          <FamilyPulseSection />
        </SectionReveal>
      </DeferredSection>
      <DeferredSection defer={deferBelowFold}>
        <Suspense fallback={<SectionFallback />}>
          <MainPathsSection />
        </Suspense>
      </DeferredSection>
      <DeferredSection defer={deferBelowFold}>
        <SectionReveal>
          <CampaignScrollStoryLazy />
        </SectionReveal>
      </DeferredSection>
      <DeferredSection defer={deferBelowFold}>
        <SectionReveal>
          <BigTestimonialLazy />
        </SectionReveal>
      </DeferredSection>
      <DeferredSection defer={deferBelowFold}>
        <SectionReveal>
          <AcademyTeaserLazy />
        </SectionReveal>
      </DeferredSection>
      <DeferredSection defer={deferBelowFold}>
        <SectionReveal>
          <FounderAsideLazy />
        </SectionReveal>
      </DeferredSection>
      <DeferredSection defer={deferBelowFold}>
        <SectionReveal>
          <FinalCTALazy />
        </SectionReveal>
      </DeferredSection>
    </main>
  );
}
