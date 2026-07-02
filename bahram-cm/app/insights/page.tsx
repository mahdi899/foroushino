import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Pencil } from "lucide-react";
import { PageHero } from "@/components/blocks/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { NewsletterCTA } from "@/components/sections/NewsletterCTA";
import { Badge } from "@/components/ui/Badge";
import { getInsights } from "@/lib/content";
import { formatDateFa } from "@/lib/persian";
import { buildMetadata } from "@/lib/seo";
import { insightCoverPhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "بلاگ",
  description: "کمپین، پیام، رشد حرفه‌ای — کوتاه و مستقیم؛ یادداشت‌های حرفه‌ای بهرام رستمی.",
  path: "/insights",
});

const covers = insightCoverPhotos;

function readTime(body: string) {
  const wpm = 220;
  const words = body.split(/\s+/).filter(Boolean).length;
  const min = Math.max(2, Math.round(words / wpm));
  return `${min.toLocaleString("fa-IR")} دقیقه مطالعه`;
}

export default async function InsightsPage() {
  const insights = await getInsights();
  const [featured, ...rest] = insights;

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Insights"
        title="بلاگ"
        description="تیز کردن نگاه؛ از پیام تا اسکلت کمپین."
      />

      {featured ? (
        <section className="py-section-sm">
          <div className="container-luxe">
            <Reveal>
              <Link
                href={`/insights/${featured.slug}`}
                className="neon-surface-hover group block overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 transition-colors hover:border-bone/25"
              >
                <div className="grid gap-0 md:grid-cols-12">
                  <div className="relative aspect-[3/2] md:col-span-7 md:aspect-auto">
                    <Image
                      src={covers[0]!}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 60vw"
                      className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col justify-center p-5 md:col-span-5 md:p-10">
                    <Badge tone="gold">برجسته</Badge>
                    <p className="mt-5 inline-flex items-center gap-2 text-caption text-gold">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                      {featured.kicker}
                    </p>
                    <h2 className="mt-3 text-h2 text-balance text-bone">{featured.title}</h2>
                    <p className="mt-4 text-bone-dim">{featured.excerpt}</p>
                    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-mist">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        {formatDateFa(featured.date)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        {readTime(featured.body)}
                      </span>
                    </div>
                    <span className="mt-7 inline-flex items-center gap-2 text-gold">
                      ادامه‌ی مطلب
                      <ArrowLeft
                        className="rtl-flip h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          </div>
        </section>
      ) : null}

      <section className="py-section-sm">
        <div className="container-luxe">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((post, i) => (
              <Reveal key={post.slug} delay={i * 0.06}>
                <Link
                  href={`/insights/${post.slug}`}
                  className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 transition-colors hover:border-bone/25"
                >
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <Image
                      src={covers[(i + 1) % covers.length]!}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="p-5 md:p-6">
                    <p className="inline-flex items-center gap-2 text-caption text-gold">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                      {post.kicker}
                    </p>
                    <h3 className="mt-3 text-h3 text-balance text-bone">{post.title}</h3>
                    <p className="mt-3 text-bone-dim">{post.excerpt}</p>
                    <div className="mt-6 flex items-center justify-between text-caption text-mist">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        {formatDateFa(post.date)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        {readTime(post.body)}
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <NewsletterCTA />
    </main>
  );
}
