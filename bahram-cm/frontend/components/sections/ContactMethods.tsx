import {
  Instagram,
  Radio,
  Send,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";

type Channel = {
  icon: LucideIcon;
  label: string;
  value: string;
  href: string;
  external?: boolean;
};

function buildChannels(): Channel[] {
  return [
    {
      icon: Instagram,
      label: "اینستاگرام",
      value: siteConfig.social.instagramHandle,
      href: siteConfig.social.instagram,
      external: true,
    },
    {
      icon: Send,
      label: "تلگرام پشتیبانی",
      value: siteConfig.social.telegramHandle,
      href: siteConfig.social.telegram,
      external: true,
    },
    {
      icon: Radio,
      label: "روبیکا پشتیبانی",
      value: siteConfig.social.rubikaHandle,
      href: siteConfig.social.rubika,
      external: true,
    },
  ];
}

export function ContactMethods({ className }: { className?: string }) {
  const channels = buildChannels();

  return (
    <div className={cn("space-y-4", className)}>
      <Reveal>
        <div className="neon-surface-static rounded-card border border-bone/10 bg-charcoal/45 p-5 md:p-6">
          <h2 className="text-h3 text-bone">{site.contactPage.channelsTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-bone-dim md:text-base">
            از هر مسیر راحت‌تری پیام بده — تیم پشتیبانی پاسخ می‌دهد.
          </p>
        </div>
      </Reveal>

      <ul className="space-y-3">
        {channels.map((channel, i) => (
          <Reveal key={channel.label} delay={0.04 + i * 0.04}>
            <li>
              <Link
                href={channel.href}
                {...(channel.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                className="neon-surface-hover group flex items-start gap-4 rounded-card border border-bone/10 bg-charcoal/45 p-4 transition-colors hover:border-bone/20 md:p-5"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-gold/25 bg-gold/[0.06] text-gold transition-colors group-hover:border-gold/40">
                  <channel.icon className="h-5 w-5" strokeWidth={1.6} aria-hidden />
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block text-caption uppercase tracking-[0.14em] text-mist">
                    {channel.label}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-bone num-latin md:text-base">
                    {channel.value}
                  </span>
                </span>
              </Link>
            </li>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
