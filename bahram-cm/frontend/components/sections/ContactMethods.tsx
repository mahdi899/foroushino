import { Instagram, Radio, Send, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { site } from "@/content/site";
import { siteSocialLinksFromContacts, type SiteSocialChannelKey } from "@/lib/chatbot/contacts";
import { getPublicChatbotConfig } from "@/lib/chatbot/public";
import type { ChatbotPublicContacts } from "@/lib/chatbot/types";
import { cn } from "@/lib/cn";

const CHANNEL_ICONS: Record<SiteSocialChannelKey, LucideIcon> = {
  instagram: Instagram,
  telegram: Send,
  rubika: Radio,
};

export async function ContactMethods({
  className,
  contacts: contactsProp,
}: {
  className?: string;
  contacts?: ChatbotPublicContacts | null;
}) {
  const contacts = contactsProp ?? (await getPublicChatbotConfig()).contacts;
  const channels = siteSocialLinksFromContacts(contacts);

  return (
    <aside
      className={cn("contact-methods flex h-full flex-col", className)}
      aria-label={site.contactPage.channelsTitle}
    >
      {/* Mobile — flat strip, no card chrome */}
      <ul className="grid grid-cols-3 gap-1 md:hidden">
        {channels.map((channel) => {
          const Icon = CHANNEL_ICONS[channel.key];
          return (
            <li key={channel.key} className="min-w-0">
              <Link
                href={channel.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${channel.label} ${channel.value}`}
                className="group flex min-w-0 flex-col items-center gap-1 px-0.5 py-1.5 text-center"
              >
                <span className="inline-flex text-gold">
                  <Icon className="h-4 w-4" strokeWidth={1.65} aria-hidden />
                </span>
                <span className="w-full truncate text-[10px] leading-tight text-mist group-hover:text-bone">
                  {channel.label}
                </span>
                <span
                  className="w-full truncate text-[10px] font-medium leading-tight text-bone-dim num-latin group-hover:text-bone"
                  dir="ltr"
                >
                  {channel.value}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop — card + channel rows */}
      <div className="neon-surface-static hidden h-full flex-col rounded-card-lg border border-bone/10 bg-charcoal/45 p-6 md:flex">
        <h2 className="font-display text-lg font-semibold text-bone md:text-xl">
          {site.contactPage.channelsTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-bone-dim">
          از هر مسیر راحت‌تری پیام بده — تیم پشتیبانی پاسخ می‌دهد.
        </p>

        <ul className="mt-6 space-y-2.5">
          {channels.map((channel) => {
            const Icon = CHANNEL_ICONS[channel.key];
            return (
              <li key={channel.key}>
                <Link
                  href={channel.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="contact-methods__link group flex items-center gap-4 rounded-tile border border-bone/8 bg-ink/35 px-4 py-3.5 transition-colors hover:border-emerald/25 hover:bg-ink/50"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-gold/22 bg-gold/[0.07] text-gold transition-colors group-hover:border-gold/38">
                    <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.65} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-caption text-mist">{channel.label}</span>
                    <span
                      className="mt-0.5 block truncate text-[0.9375rem] font-medium text-bone num-latin"
                      dir="ltr"
                    >
                      {channel.value}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
