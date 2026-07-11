import Link from "next/link";
import { Instagram, Mail, Radio, Send, type LucideIcon } from "lucide-react";
import { site } from "@/content/site";
import { SITE_MEDIA } from "@/config/media";
import { Divider } from "@/components/ui/Divider";
import { DirectMediaImg } from "@/components/ui/DirectMediaImg";
import { Logo } from "./Logo";
import { toPersianDigits } from "@/lib/persian";

const mobileLegalLinks = [
  { href: "/legal/privacy", label: "حریم خصوصی" },
  { href: "/legal/terms", label: "قوانین" },
] as const;

const footerContactIcons: Record<string, LucideIcon> = {
  اینستاگرام: Instagram,
  تلگرام: Send,
  روبیکا: Radio,
  ایمیل: Mail,
};
export function SiteFooter() {
  const year = toPersianDigits(new Date().getFullYear());

  return (
    <footer className="relative border-t border-bone/5">
      <div className="container-luxe py-5 md:py-20">
        <div className="flex flex-col gap-5 md:grid md:grid-cols-12 md:gap-12">
          <div className="hidden text-start md:col-span-5 md:block">
            <Logo size="footer" />
            <p className="mt-3 hidden max-w-sm text-balance text-body leading-relaxed text-bone-dim md:block">
              {site.footer.tagline}
            </p>
            <p className="mt-2 hidden max-w-sm text-caption text-mist md:mt-3 md:block">
              کمپین‌نویسی، ورود به {site.ecosystem}.
            </p>
            <div
              className="footer-trust-badges mt-8 hidden border-t border-bone/10 pt-8 md:flex"
              aria-label="نشان‌های اعتماد"
            >
              {site.footer.trustBadges.map((badge) => {
                const src = SITE_MEDIA[`trust-${badge.id}`]?.src;
                return (
                  <a
                    key={badge.id}
                    href={badge.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="footer-trust-badge group"
                    title={badge.alt}
                  >
                    {src ? (
                      <span className="footer-trust-badge__surface">
                        <span className="footer-trust-badge__inner">
                          <DirectMediaImg
                            src={src}
                            alt={badge.alt}
                            className="footer-trust-badge__img"
                          />
                        </span>
                      </span>
                    ) : (
                      <span className="footer-trust-badge__surface text-xs text-mist">{badge.alt}</span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-7 md:grid md:grid-cols-2 md:gap-x-12 md:gap-y-8">
            {/* Mobile — compact */}
            <div className="md:hidden">
              <div className="flex justify-center">
                <Logo size="footer" className="text-base" />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {site.footer.contact.map((link) => {
                  const Icon = footerContactIcons[link.label] ?? Mail;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      {...("external" in link && link.external
                        ? { target: "_blank", rel: "noreferrer noopener" }
                        : {})}
                      className="group flex min-w-0 flex-col items-center gap-1.5 text-center"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-bone/10 bg-bone/[0.04] text-bone-dim transition-colors group-hover:border-emerald-glow/30 group-hover:text-emerald-glow">
                        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="w-full truncate text-[10px] leading-tight text-mist transition-colors group-hover:text-bone">
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
            {/* Desktop */}
            <section className="hidden min-w-0 md:block">
              <h3 className="text-caption font-medium uppercase leading-tight tracking-[0.2em] text-gold">
                {site.footer.navTitle}
              </h3>
              <ul className="mt-5 space-y-3">
                {site.nav.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm leading-snug text-bone-dim transition-colors hover:text-bone"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="hidden min-w-0 md:block">
              <h3 className="text-caption font-medium uppercase leading-tight tracking-[0.2em] text-gold">
                {site.footer.contactTitle}
              </h3>
              <ul className="mt-5 space-y-3">
                {site.footer.contact.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      {...("external" in link && link.external
                        ? { target: "_blank", rel: "noreferrer noopener" }
                        : {})}
                      className="text-sm leading-snug text-bone-dim transition-colors hover:text-bone"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <Divider className="mt-4 opacity-80 md:mt-12 md:opacity-100" />

        <div className="mt-3 flex flex-nowrap items-center justify-between gap-2 md:mt-8 md:flex-wrap md:gap-4">
          <p className="shrink-0 text-[10px] leading-none text-mist md:text-caption md:leading-snug">
            © {year} {site.founder}
          </p>
          <nav
            aria-label="حقوقی"
            className="flex shrink-0 items-center gap-x-2.5 md:gap-x-6"
          >
            {mobileLegalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-[10px] leading-none text-mist hover:text-bone md:text-caption"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/legal/cookies"
              className="hidden text-caption text-mist hover:text-bone md:inline"
            >
              کوکی‌ها
            </Link>
            <Link
              href="/legal/data-request"
              className="hidden text-caption text-mist hover:text-bone md:inline"
            >
              درخواست داده
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
