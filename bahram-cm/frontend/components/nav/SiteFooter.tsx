import Link from "next/link";
import { site } from "@/content/site";
import { Divider } from "@/components/ui/Divider";
import { Logo } from "./Logo";
import { toPersianDigits } from "@/lib/persian";

const mobileLegalLinks = [
  { href: "/legal/privacy", label: "حریم خصوصی" },
  { href: "/legal/terms", label: "قوانین" },
] as const;

export function SiteFooter() {
  const year = toPersianDigits(new Date().getFullYear());

  return (
    <footer className="relative border-t border-bone/5">
      <div className="container-luxe py-5 md:py-20">
        <div className="flex flex-col gap-5 md:grid md:grid-cols-12 md:gap-12">
          <div className="text-start md:col-span-5">
            <Logo size="footer" />
            <p className="mt-3 hidden max-w-sm text-balance text-body leading-relaxed text-bone-dim md:block">
              {site.footer.tagline}
            </p>
            <p className="mt-2 hidden max-w-sm text-caption text-mist md:mt-3 md:block">
              کمپین‌نویسی، ورود به {site.ecosystem}.
            </p>
            <div
              className="mt-8 hidden flex-row flex-wrap gap-x-5 gap-y-2 border-t border-bone/10 pt-8 md:flex"
              aria-label="نشان‌های اعتماد"
            >
              {site.footer.trustBadges.map((badge) => (
                <a
                  key={badge.id}
                  href={badge.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm text-bone-dim transition-colors hover:text-bone"
                >
                  {badge.alt}
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-7 md:grid md:grid-cols-2 md:gap-x-12 md:gap-y-8">
            {/* Mobile — compact */}
            <div className="border-t border-bone/10 pt-4 md:hidden">
              <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {site.nav.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block py-1 text-xs text-bone-dim transition-colors hover:text-bone"
                    >
                      {link.shortLabel ?? link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-bone/5 pt-3">
                {site.footer.contact.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    {...("external" in link && link.external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                    className="text-xs text-mist transition-colors hover:text-bone"
                  >
                    {link.label}
                  </Link>
                ))}
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

        <div className="mt-3 flex flex-col gap-2 md:mt-8 md:flex-row md:items-center md:justify-between md:gap-4">
          <p className="text-[11px] leading-snug text-mist md:text-caption">
            © {year} {site.founder}
          </p>
          <nav
            aria-label="حقوقی"
            className="flex flex-wrap gap-x-3 gap-y-1 md:gap-x-6"
          >
            {mobileLegalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] text-mist hover:text-bone md:text-caption"
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
