import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHero } from "@/components/blocks/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { getResources } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { resourceCoverPhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "منابع",
  description:
    "چک‌لیست‌ها، قالب‌ها و کاربرگ‌های عملی برای پیام، کمپین، قیمت‌گذاری و برند شخصی.",
  path: "/resources",
});

const covers = resourceCoverPhotos;

export default async function ResourcesPage() {
  const resources = await getResources();

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Resources"
        title="منابع"
        description="ابزارهای عملی و آماده‌ی استفاده؛ از چک‌لیست کمپین تا بوم پیشنهاد."
      />

      <section className="py-section-sm">
        <div className="container-luxe">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((r, i) => (
              <Reveal key={r.slug} delay={(i % 3) * 0.06}>
                <Link
                  href={`/resources/${r.slug}`}
                  className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 transition-colors hover:border-bone/25"
                >
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <Image
                      src={covers[i % covers.length]!}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
                    />
                    <span className="absolute end-3 top-3 z-[2]">
                      <Badge tone="neutral">{r.type}</Badge>
                    </span>
                  </div>
                  <div className="p-5 md:p-6">
                    <FileText className="h-5 w-5 text-gold" strokeWidth={1.5} aria-hidden />
                    <h2 className="mt-3 text-h3 text-balance text-bone">{r.title}</h2>
                    <p className="mt-3 text-bone-dim">{r.summary}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-gold">
                      مشاهده
                      <ArrowLeft
                        className="rtl-flip h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
