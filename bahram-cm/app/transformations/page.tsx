import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/blocks/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { getTransformations } from "@/lib/content";
import { caseStudyPortrait } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "رضایت دانشجوها",
  description: "رضایت واقعی دانشجوها؛ بدون ژست — تجربه‌های مسیر با کمپین و برند شخصی.",
  path: "/transformations",
});

export default async function TransformationsPage() {
  const cases = await getTransformations();

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Case Studies"
        title="رضایت واقعی"
        description="از خاموشی تا کمپینی که دیده می‌شود."
      />
      <section className="py-section-sm">
        <div className="container-luxe grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((item, i) => (
            <Reveal key={item.slug} delay={i * 0.06}>
              <Link
                href={`/transformations/${item.slug}`}
                className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/55 p-5 transition-colors hover:border-bone/25 md:p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={caseStudyPortrait(item.slug)} alt={item.name} size={52} />
                    <div>
                      <h2 className="text-h3 leading-tight">{item.name}</h2>
                      <p className="text-caption text-gold">{item.role}</p>
                    </div>
                  </div>
                  <Badge tone="emerald">دانشجو</Badge>
                </div>

                <dl className="mt-6 grid gap-3 text-caption">
                  <div className="rounded-tile border border-bone/8 bg-ink/60 p-3">
                    <dt className="text-mist">قبل</dt>
                    <dd className="mt-1 text-bone-dim">{item.before}</dd>
                  </div>
                  <div className="rounded-tile border border-emerald/25 bg-emerald-deep/25 p-3">
                    <dt className="text-emerald-glow">بعد</dt>
                    <dd className="mt-1 text-bone">{item.after}</dd>
                  </div>
                </dl>

                <p className="mt-5 border-t border-bone/10 pt-5 text-bone-dim">{item.summary}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-gold">
                  مطالعه کامل
                  <ArrowLeft
                    className="rtl-flip h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
