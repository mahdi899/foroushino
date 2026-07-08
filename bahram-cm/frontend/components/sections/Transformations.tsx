import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { site } from "@/content/site";
import { caseStudyPortrait } from "@/lib/site-photo-paths";

const items = site.transformations.map((item) => ({
  ...item,
  avatar: caseStudyPortrait(item.slug),
}));

export function Transformations() {
  return (
    <section className="bg-obsidian py-section">
      <div className="container-luxe">
        <Reveal>
          <Eyebrow>رضایت دانشجوها</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-5 max-w-3xl text-h2 text-balance">
            رضایت واقعی — به زبان خود دانشجوها.
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-5 max-w-2xl text-bone-dim">
            چهار مثال از کسانی که مسیر را جدی گرفتند و خروجی ساختاری به‌دست آوردند.
          </p>
        </Reveal>

        <div className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-4">
          {items.map((item, idx) => (
            <Reveal
              key={item.slug}
              delay={idx * 0.07}
              className="min-w-[86%] snap-start md:min-w-0"
            >
              <article className="neon-surface-hover group relative h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/60 p-6 transition-colors hover:border-bone/25">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={item.avatar} alt={item.name} size={48} />
                    <div>
                      <h3 className="text-h3 leading-tight">{item.name}</h3>
                      <p className="text-caption text-gold">{item.role}</p>
                    </div>
                  </div>
                  <Badge tone="emerald">دانشجو</Badge>
                </div>

                <dl className="mt-6 grid grid-cols-1 gap-3 text-caption">
                  <div className="rounded-tile border border-bone/8 bg-ink/60 p-3">
                    <dt className="text-mist">قبل</dt>
                    <dd className="mt-1 text-bone-dim">{item.before}</dd>
                  </div>
                  <div className="rounded-tile border border-emerald/25 bg-emerald-deep/25 p-3">
                    <dt className="text-emerald-glow">بعد</dt>
                    <dd className="mt-1 text-bone">{item.after}</dd>
                  </div>
                </dl>

                <p className="mt-5 border-t border-bone/10 pt-5 text-bone-dim">{item.oneLine}</p>

                {item.metricValue && item.metricLabel ? (
                  <p className="mt-4 font-display text-sm font-semibold text-gold num-latin">
                    {item.metricValue}
                    <span className="me-1 font-normal text-mist"> {item.metricLabel}</span>
                  </p>
                ) : null}

                <Link
                  href={`/transformations/${item.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-gold transition-colors hover:text-gold-soft"
                >
                  مطالعه کامل
                  <ArrowLeft
                    className="rtl-flip h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
