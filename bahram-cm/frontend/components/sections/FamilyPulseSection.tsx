import { LinkButton } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Marquee } from '@/components/motion/Marquee';
import { Reveal } from '@/components/motion/Reveal';
import { FamilyPulseQuote } from '@/components/sections/FamilyPulseQuote';
import { getFamilyPulse } from '@/lib/family/pulse';
import { familyHomeHref } from '@/lib/domains';

export async function FamilyPulseSection() {
  const pulse = await getFamilyPulse();

  if (pulse.length === 0) return null;

  const items = pulse.slice(0, 8);

  return (
    <section
      aria-label="خانواده داداش بهرام"
      className="relative isolate w-full overflow-hidden py-8 sm:py-10"
    >
      <Reveal>
        <div className="px-5 text-center">
          <Eyebrow className="justify-center">خانواده داداش بهرام</Eyebrow>
        </div>
      </Reveal>

      <div className="relative mt-5 sm:mt-6">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-[var(--color-charcoal)] to-transparent sm:w-16"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-[var(--color-charcoal)] to-transparent sm:w-16"
          aria-hidden
        />
        <Marquee speed={48} className="py-1">
          {items.map((item) => (
            <FamilyPulseQuote key={item.id} body={item.body} name={item.name} />
          ))}
        </Marquee>
      </div>

      <Reveal delay={0.12}>
        <div className="mt-6 px-5 text-center sm:mt-8">
          <LinkButton href={familyHomeHref()} variant="primary" withArrow>
            بپیوند به خانواده
          </LinkButton>
        </div>
      </Reveal>
    </section>
  );
}
