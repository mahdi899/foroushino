import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
};

export function CTAStack({ title, body, primary, secondary }: Props) {
  return (
    <section className="py-section-sm">
      <div className="container-luxe">
        <Reveal>
          <div className="neon-cta-slab rounded-card border border-emerald/20 bg-gradient-to-b from-emerald-deep/35 via-charcoal/65 to-ink p-8 md:p-10">
            <h2 className="text-h2 text-balance">{title}</h2>
            <p className="mt-4 max-w-2xl text-bone-dim">{body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href={primary.href} variant="primary" withArrow size="lg">
                {primary.label}
              </LinkButton>
              {secondary ? (
                <LinkButton href={secondary.href} variant="ghost" size="lg">
                  {secondary.label}
                </LinkButton>
              ) : null}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
