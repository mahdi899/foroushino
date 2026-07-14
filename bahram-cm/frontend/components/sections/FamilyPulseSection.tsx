import { LinkButton } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/motion/Reveal';
import { getFamilyPulse } from '@/lib/family/pulse';

export async function FamilyPulseSection() {
  const pulse = await getFamilyPulse();

  if (pulse.length === 0) return null;

  return (
    <section className="relative isolate mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <Reveal>
        <div className="text-center">
          <Eyebrow className="justify-center">خانواده داداش بهرام</Eyebrow>
          <h2 className="mt-3 font-display text-2xl font-bold text-bone sm:text-3xl">
            صدای واقعی خانواده
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-bone-dim">
            نمونه‌ای از گفتگوهای روزمره‌ای که داداش بهرام مستقیم با اعضای خانواده‌اش داره.
          </p>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {pulse.slice(0, 6).map((item, i) => (
          <Reveal key={item.id} delay={i * 0.05}>
            <blockquote className="h-full rounded-2xl border border-bone/10 bg-charcoal-2/60 p-4">
              <p className="line-clamp-4 text-sm leading-6 text-bone/85">{item.body}</p>
              <footer className="mt-3 text-xs font-medium text-gold/80">— {item.name}</footer>
            </blockquote>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <div className="mt-8 text-center">
          <LinkButton href="/family" variant="primary" withArrow>
            بپیوند به خانواده
          </LinkButton>
        </div>
      </Reveal>
    </section>
  );
}
