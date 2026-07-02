import Link from "next/link";
import { PageHero } from "@/components/blocks/PageHero";
import { Reveal } from "@/components/motion/Reveal";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

/**
 * Shared renderer for legal/policy documents so privacy, terms, cookies and
 * data-request pages stay visually consistent and easy to keep in sync.
 */
export function LegalDoc({
  eyebrow = "Legal",
  title,
  description,
  lastUpdated,
  intro,
  sections,
  contactEmail = "hello@bahramrostami.com",
  related,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
  contactEmail?: string;
  related?: { href: string; label: string }[];
}) {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero eyebrow={eyebrow} title={title} description={description} />

      <section className="py-section-sm">
        <div className="container-luxe max-w-3xl min-w-0">
          <Reveal>
            <p className="text-caption text-mist">
              آخرین به‌روزرسانی: <span className="num-latin">{lastUpdated}</span>
            </p>
          </Reveal>

          {intro ? (
            <Reveal delay={0.06}>
              <p className="mt-5 text-lg leading-relaxed text-bone-dim">{intro}</p>
            </Reveal>
          ) : null}

          <div className="mt-10 space-y-10">
            {sections.map((s, i) => (
              <Reveal key={s.heading} delay={Math.min(i * 0.04, 0.2)}>
                <section>
                  <h2 className="text-h3 text-balance text-bone">{s.heading}</h2>
                  {s.paragraphs?.map((p, j) => (
                    <p key={j} className="mt-4 leading-relaxed text-bone-dim">
                      {p}
                    </p>
                  ))}
                  {s.bullets?.length ? (
                    <ul className="mt-4 space-y-2">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-bone-dim">
                          <span
                            aria-hidden
                            className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-glow"
                          />
                          {b}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-12 rounded-card border border-bone/10 bg-charcoal/40 p-6 md:p-8">
              <h2 className="text-h3 text-balance text-bone">تماس و سوالات</h2>
              <p className="mt-3 text-bone-dim">
                برای هر پرسش درباره‌ی این سند یا داده‌هایت، با ما در تماس باش:
              </p>
              <a
                href={`mailto:${contactEmail}`}
                className="mt-3 inline-block text-gold transition-colors hover:text-gold-soft num-latin"
              >
                {contactEmail}
              </a>
              {related?.length ? (
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-bone/8 pt-6 text-caption">
                  {related.map((r) => (
                    <Link
                      key={r.href}
                      href={r.href}
                      className="text-mist transition-colors hover:text-bone"
                    >
                      {r.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
