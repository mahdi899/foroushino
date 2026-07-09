import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, PlayCircle, Radio } from "lucide-react";
import { PageHero } from "@/components/blocks/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { SiteImage } from "@/components/ui/SiteImage";
import { getEvents } from "@/lib/content";
import { formatDateFa } from "@/lib/persian";
import { resolveMediaAlt } from "@/lib/media/alt";
import { eventCoverPhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "رویدادها",
  description: "نشست‌های زنده و آرشیو برای تیز کردن نگاه؛ کارگاه، کلینیک پیام و جلسات پرسش‌وپاسخ.",
  path: "/events",
});

const covers = eventCoverPhotos;

export default async function EventsPage() {
  const events = await getEvents();
  const upcoming = events.filter((e) => e.status === "upcoming");
  const archive = events.filter((e) => e.status === "recording");

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Events"
        title="رویدادها و نشست‌ها"
        description="زنده برای تعامل؛ آرشیو برای مرور سریع."
      />

      {upcoming.length ? (
        <section className="py-section-sm">
          <div className="container-luxe">
            <p className="text-caption uppercase tracking-[0.25em] text-gold">در پیشِ رو</p>
            <h2 className="mt-4 text-h2 text-balance">نشست‌های زنده‌ی پیش رو.</h2>
            <div className="mt-7 grid gap-5 md:mt-10 md:grid-cols-2">
              {await Promise.all(
                upcoming.map(async (event, i) => {
                  const cover = covers[i % covers.length]!;
                  const coverAlt = await resolveMediaAlt(cover, `کاور ${event.title}`);
                  return (
                    <Reveal key={event.slug} delay={i * 0.07}>
                      <EventCard event={event} cover={cover} coverAlt={coverAlt} live />
                    </Reveal>
                  );
                }),
              )}
            </div>
          </div>
        </section>
      ) : null}

      {archive.length ? (
        <section className="bg-obsidian py-section-sm">
          <div className="container-luxe">
            <p className="text-caption uppercase tracking-[0.25em] text-gold">آرشیو</p>
            <h2 className="mt-4 text-h2 text-balance">نشست‌های ضبط‌شده.</h2>
            <div className="mt-7 grid gap-5 md:mt-10 md:grid-cols-2 lg:grid-cols-3">
              {await Promise.all(
                archive.map(async (event, i) => {
                  const cover = covers[(i + 1) % covers.length]!;
                  const coverAlt = await resolveMediaAlt(cover, `کاور ${event.title}`);
                  return (
                    <Reveal key={event.slug} delay={i * 0.06}>
                      <EventCard event={event} cover={cover} coverAlt={coverAlt} />
                    </Reveal>
                  );
                }),
              )}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function EventCard({
  event,
  cover,
  coverAlt,
  live = false,
}: {
  event: { slug: string; title: string; date: string; place: string; summary: string; status: string };
  cover: string;
  coverAlt: string;
  live?: boolean;
}) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 transition-colors hover:border-bone/25"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <SiteImage
          src={cover}
          alt={coverAlt}
          fallbackAlt={`کاور ${event.title}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
        />
        <div className="absolute inset-x-0 bottom-0 photo-scrim-bottom-bar p-4">
          <Badge tone={live ? "emerald" : "neutral"}>
            {live ? (
              <Radio className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
            )}
            {live ? "زنده · در پیش‌رو" : "ضبط‌شده"}
          </Badge>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-h3 text-balance text-bone">{event.title}</h3>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-mist">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            {formatDateFa(event.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            {event.place}
          </span>
        </div>
        <p className="mt-4 text-bone-dim">{event.summary}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-gold">
          مشاهده جزئیات
          <ArrowLeft className="rtl-flip h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
