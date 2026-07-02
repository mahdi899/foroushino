import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { ContentViewTracker } from "@/components/analytics/ContentViewTracker";
import { MdxBody } from "@/components/mdx/MdxBody";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { getResourceBySlug, getResources } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { resourceCoverPhotos } from "@/lib/site-photo-paths";

const covers = resourceCoverPhotos;

export async function generateStaticParams() {
  const items = await getResources();
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getResourceBySlug(slug);
  if (!item) return {};
  return buildMetadata({
    title: item.title,
    description: item.summary,
    path: `/resources/${item.slug}`,
    type: "article",
  });
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getResourceBySlug(slug);
  if (!item) notFound();

  const all = await getResources();
  const idx = all.findIndex((r) => r.slug === slug);
  const cover = covers[idx % covers.length]!;
  const related = all.filter((r) => r.slug !== slug).slice(0, 3);

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <ContentViewTracker type="resource" slug={item.slug} />
      <section className="relative isolate overflow-hidden bg-ink">
        <div aria-hidden className="absolute inset-0 opacity-50">
          <Image src={cover} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/75 to-ink" />
        </div>
        <div className="container-luxe relative z-[2] max-w-3xl min-w-0 py-section-sm">
          <Reveal>
            <Link
              href="/resources"
              className="inline-flex items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft"
            >
              <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
              منابع
            </Link>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="mt-6 md:mt-8">
              <Badge tone="gold">{item.type}</Badge>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <h1 className="mt-4 text-h1 text-balance md:text-display">{item.title}</h1>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="mt-5 max-w-2xl text-bone-dim">{item.summary}</p>
          </Reveal>
          {item.downloadUrl ? (
            <Reveal delay={0.24}>
              <div className="mt-7">
                <LinkButton href={item.downloadUrl} size="lg">
                  <Download className="h-4 w-4" strokeWidth={1.6} aria-hidden />
                  دریافت فایل
                </LinkButton>
              </div>
            </Reveal>
          ) : null}
        </div>
      </section>

      <section className="py-section-sm">
        <div className="container-luxe max-w-3xl min-w-0">
          <article className="prose-luxe text-bone-dim">
            <MdxBody source={item.body} />
          </article>
        </div>
      </section>

      {related.length ? (
        <section className="bg-obsidian py-section-sm">
          <div className="container-luxe">
            <p className="text-caption uppercase tracking-[0.25em] text-gold">منابع بیشتر</p>
            <div className="mt-7 grid gap-5 md:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/resources/${r.slug}`}
                  className="neon-surface-hover group block h-full rounded-card border border-bone/10 bg-charcoal/45 p-6 transition-colors hover:border-bone/25"
                >
                  <Badge tone="neutral">{r.type}</Badge>
                  <h3 className="mt-3 text-h3 text-balance text-bone">{r.title}</h3>
                  <p className="mt-2 text-bone-dim">{r.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
