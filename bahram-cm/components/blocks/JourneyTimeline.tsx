import { Chip } from "@/components/ui/Chip";
import { Reveal } from "@/components/motion/Reveal";

type Step = { title: string; body: string; tag: string };

export function JourneyTimeline({ steps }: { steps: Step[] }) {
  return (
    <section className="py-section-sm">
      <div className="container-luxe">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => (
            <Reveal key={step.title} delay={idx * 0.06}>
              <article className="neon-surface-static h-full rounded-card border border-bone/10 bg-charcoal/55 p-6">
                <Chip>{step.tag}</Chip>
                <h3 className="mt-4 text-h3">{step.title}</h3>
                <p className="mt-3 text-bone-dim">{step.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
