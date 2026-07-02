"use client";

import { Quote } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

export type CampaignTestimonial = {
  avatar: string;
  name: string;
  role: string;
  quote: string;
};

function TestimonialCard({
  t,
  className,
}: {
  t: CampaignTestimonial;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "neon-surface-hover h-full rounded-card border border-bone/10 bg-charcoal/55 p-5 md:p-6",
        className,
      )}
    >
      <Quote className="h-6 w-6 text-gold/45" strokeWidth={1.4} aria-hidden />
      <p className="mt-3 text-bone md:mt-4">«{t.quote}»</p>
      <div className="mt-5 flex items-center gap-3 border-t border-bone/8 pt-4 md:mt-6 md:pt-5">
        <Avatar src={t.avatar} alt={t.name} size={44} />
        <div>
          <p className="text-bone">{t.name}</p>
          <p className="text-caption text-gold">{t.role}</p>
        </div>
      </div>
    </article>
  );
}

export function CampaignWritingTestimonials({ items }: { items: CampaignTestimonial[] }) {
  return (
    <>
      <div className="mt-7 hidden gap-5 md:mt-10 md:grid md:grid-cols-3">
        {items.map((t, idx) => (
          <Reveal key={t.name} delay={idx * 0.07}>
            <TestimonialCard t={t} />
          </Reveal>
        ))}
      </div>

      <div
        className="mt-7 md:hidden"
        role="region"
        aria-label="نظر دانشجوها — اسلاید افقی"
      >
        <div
          className={cn(
            "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2",
            "-mx-4 px-4",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {items.map((t) => (
            <TestimonialCard
              key={t.name}
              t={t}
              className="w-[min(calc(100vw-3.5rem),20rem)] shrink-0 snap-center"
            />
          ))}
        </div>
      </div>
    </>
  );
}
