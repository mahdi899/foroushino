import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageHero({ eyebrow, title, description }: Props) {
  return (
    <section className="relative overflow-x-clip overflow-y-visible bg-ink wash-emerald py-section-sm md:py-section">
      <div className="container-luxe relative z-[2] min-w-0 max-w-full">
        {eyebrow ? (
          <Reveal>
            <Eyebrow>{eyebrow}</Eyebrow>
          </Reveal>
        ) : null}
        <Reveal delay={0.08}>
          <h1 className="mt-4 max-w-4xl text-h1 text-balance md:mt-5">{title}</h1>
        </Reveal>
        {description ? (
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-2xl text-bone-dim md:mt-6">{description}</p>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
