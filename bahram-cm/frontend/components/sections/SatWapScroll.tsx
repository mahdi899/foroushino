"use client";

import { SiteImage } from "@/components/ui/SiteImage";
import {
  BookOpen,
  Network,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { formatFa } from "@/lib/persian";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

export type SatWapIconKey = "book-open" | "smartphone" | "network";

export type SatWapPillar = {
  tag: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  icon: SatWapIconKey;
  chips: string[];
};

const wapIcons: Record<SatWapIconKey, LucideIcon> = {
  "book-open": BookOpen,
  smartphone: Smartphone,
  network: Network,
};

function resolveWapIcon(key: SatWapIconKey): LucideIcon {
  return wapIcons[key] ?? BookOpen;
}

function WapPillarCard({ pillar }: { pillar: SatWapPillar }) {
  const Icon = resolveWapIcon(pillar.icon);

  return (
    <article className="group overflow-hidden rounded-card-lg border border-bone/10 bg-charcoal/35 shadow-[0_24px_48px_-32px_rgba(0,0,0,0.65)] transition-colors duration-500 hover:border-gold/22">
      <div className="grid lg:grid-cols-12 lg:items-stretch">
        <figure className="relative aspect-[5/4] min-h-[11rem] overflow-hidden lg:col-span-5 lg:aspect-auto lg:min-h-[14rem]">
          <SiteImage
            src={pillar.image}
            alt={pillar.alt}
            fill
            className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
            sizes="(max-width: 1023px) 100vw, 42vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-ink/20" />
        </figure>

        <div className="flex flex-col justify-center gap-3 p-5 lg:col-span-7 lg:p-6 xl:p-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/[0.12] text-gold">
              <Icon className="h-4 w-4" strokeWidth={1.6} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-caption uppercase tracking-[0.2em] text-gold">{pillar.tag}</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-bone md:text-xl">{pillar.title}</h3>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-bone-dim md:text-base">{pillar.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {pillar.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-pill border border-gold/20 bg-gold/[0.07] px-2.5 py-0.5 text-xs text-bone"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function WapPriceCard({ price }: { price: number }) {
  const priceLabel = `${formatFa(price)} تومان`;

  return (
    <div
      data-neon-tone="gold"
      className="neon-surface-static rounded-card-lg border border-gold/25 bg-charcoal/55 p-5 ring-1 ring-gold/10 md:p-6"
    >
      <p className="text-caption uppercase tracking-[0.25em] text-gold">هزینه شروع</p>
      <p className="mt-2 font-display text-h3 text-bone">{priceLabel}</p>
      <p className="mt-2 text-sm leading-relaxed text-bone-dim md:text-base">
        آموزش، اپ سات و همراهی تیم فروش — نه فقط یک دوره. نتیجه به تلاش و عملکرد هر فرد بستگی
        دارد.
      </p>
      <LinkButton href="/apply" variant="vip" size="md" withArrow className="mt-4 w-full sm:w-auto">
        بررسی شرایط ورود
      </LinkButton>
    </div>
  );
}

function WapHeader() {
  return (
    <div className="max-w-2xl min-w-0">
      <Eyebrow>ورود به سات</Eyebrow>
      <h2 className="mt-3 text-h3 text-balance text-bone md:mt-4 md:text-h2">
        یک مسیر کامل، نه فقط یک دوره
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-bone-dim md:text-base">
        اول یاد می‌گیری، بعد با اپ سات کار می‌کنی و وارد تیم فروش می‌شوی. هزینه ورود برای کل
        این مسیر است.
      </p>
    </div>
  );
}

function WapStack({ pillars, price }: { pillars: SatWapPillar[]; price: number }) {
  return (
    <div className="container-luxe min-w-0 py-section-sm md:py-section">
      <WapHeader />
      <div className="mt-6 flex flex-col gap-5 md:mt-8 md:gap-6">
        {pillars.map((pillar, i) => (
          <Reveal key={pillar.title} delay={i * 0.06} y={20}>
            <WapPillarCard pillar={pillar} />
          </Reveal>
        ))}
        <Reveal delay={0.18} y={20}>
          <WapPriceCard price={price} />
        </Reveal>
      </div>
    </div>
  );
}

export function SatWapScroll({ pillars, price }: { pillars: SatWapPillar[]; price: number }) {
  return (
    <section id="wap" aria-labelledby="sat-wap-heading" className="scroll-mt-20 border-t border-gold/10 bg-obsidian">
      <h2 id="sat-wap-heading" className="sr-only">
        ورود به سات
      </h2>
      <WapStack pillars={pillars} price={price} />
    </section>
  );
}
