import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, PlayCircle, Radio } from "lucide-react";
import { ContentViewTracker } from "@/components/analytics/ContentViewTracker";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { MdxBody } from "@/components/mdx/MdxBody";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { getEventBySlug, getEvents } from "@/lib/content";
import { formatDateFa } from "@/lib/persian";
import { buildMetadata } from "@/lib/seo";
import { eventCoverPhotos } from "@/lib/site-photo-paths";

const covers = eventCoverPhotos;

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  return buildMetadata({
    title: event.title,
    description: event.summary,
    path: `/events/${event.slug}`,
    type: "article",
  });
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const all = await getEvents();
  const idx = all.findIndex((e) => e.slug === slug);
  const cover = covers[idx % covers.length]!;
  const live = event.status === "upcoming";

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <ContentViewTracker type="event" slug={event.slug} />
      <section className="relative isolate overflow-hidden bg-ink">
        <div aria-hidden className="absolute inset-0">
          <Image src={cover} alt="" fill priority className="object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/75 to-ink" />
        </div>
        <div className="container-luxe relative z-[2] max-w-4xl min-w-0 py-section-sm">
          <Reveal>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft"
            >
              <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
              رویدادها
            </Link>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="mt-6 md:mt-8">
              <Badge tone={live ? "emerald" : "neutral"}>
                {live ? (
                  <Radio className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                ) : (
                  <PlayCircle className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                )}
                {live ? "زنده · در پیش‌رو" : "ضبط‌شده"}
              </Badge>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <h1 className="mt-4 max-w-full min-w-0 text-h1 text-balance md:mt-6 md:text-display">{event.title}</h1>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-bone-dim">
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gold" strokeWidth={1.5} aria-hidden />
                {formatDateFa(event.date)}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold" strokeWidth={1.5} aria-hidden />
                {event.place}
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.28}>
            <div className="mt-7 md:mt-10">
              <TrackedLinkButton
                href={event.registerUrl ?? "/apply"}
                event="event_register_click"
                eventProps={{ event: event.slug }}
                size="lg"
                withArrow
                {...(event.registerUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {live ? "ثبت‌نام در نشست" : "ورود به آکادمی"}
              </TrackedLinkButton>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-section-sm">
        <div className="container-luxe max-w-3xl min-w-0">
          <article className="prose-luxe text-bone-dim">
            <MdxBody source={event.body} />
          </article>
        </div>
      </section>
    </main>
  );
}
