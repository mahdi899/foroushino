import { Instagram, Radio, Send, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { site } from "@/content/site";
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
      label: "تلگرام",
      value: siteConfig.social.telegramHandle,
      href: siteConfig.social.telegram,
      external: true,
    },
    {
      icon: Radio,
      label: "روبیکا",
      value: siteConfig.social.rubikaHandle,
      href: siteConfig.social.rubika,
      external: true,
    },
  ];
}

export function ContactMethods({ className }: { className?: string }) {
  const channels = buildChannels();

  return (
    <aside
      className={cn(
        "contact-methods neon-surface-static flex h-full flex-col rounded-card-lg border border-bone/10 bg-charcoal/45 p-5 md:p-6",
        className,
      )}
      aria-label={site.contactPage.channelsTitle}
    >
      <h2 className="font-display text-lg font-semibold text-bone md:text-xl">
        {site.contactPage.channelsTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-bone-dim">
        از هر مسیر راحت‌تری پیام بده — تیم پشتیبانی پاسخ می‌دهد.
      </p>

      <ul className="mt-5 space-y-2.5 md:mt-6">
        {channels.map((channel) => (
          <li key={channel.label}>
            <Link
              href={channel.href}
              {...(channel.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
              className="contact-methods__link group flex items-center gap-3 rounded-tile border border-bone/8 bg-ink/35 px-3.5 py-3 transition-colors hover:border-emerald/25 hover:bg-ink/50 md:gap-4 md:px-4 md:py-3.5"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-gold/22 bg-gold/[0.07] text-gold transition-colors group-hover:border-gold/38">
                <channel.icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.65} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-caption text-mist">{channel.label}</span>
                <span className="mt-0.5 block truncate text-sm font-medium text-bone num-latin md:text-[0.9375rem]">
                  {channel.value}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
