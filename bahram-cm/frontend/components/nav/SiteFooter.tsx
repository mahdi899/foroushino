import Link from "next/link";
import { site } from "@/content/site";
import { SITE_MEDIA } from "@/config/media";
import { Divider } from "@/components/ui/Divider";
import { SiteImage } from "@/components/ui/SiteImage";
import { Logo } from "./Logo";
import { toPersianDigits } from "@/lib/persian";

const TRUST_BADGE_MEDIA: Record<
  (typeof site.footer.trustBadges)[number]["id"],
  string
> = {
  enamad: SITE_MEDIA["trust-enamad"]!.src,
  samandehi: SITE_MEDIA["trust-samandehi"]!.src,
  zarinpal: SITE_MEDIA["trust-zarinpal"]!.src,
};

export function SiteFooter() {
  const year = toPersianDigits(new Date().getFullYear());

  return (
    <footer className="relative border-t border-bone/5">
      <div className="container-luxe py-6 md:py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5">
            <Logo size="footer" />
            <p className="mt-2 max-w-sm text-balance text-sm leading-snug text-bone-dim md:mt-5 md:text-body">
              {site.footer.tagline}
            </p>
            <p className="mt-2 hidden max-w-sm text-caption text-mist md:mt-3 md:block">
              کمپین‌نویسی، ورود به {site.ecosystem}.
            </p>
            <div
              className="mt-5 flex flex-wrap items-center gap-3 border-t border-bone/10 pt-5 md:mt-8 md:gap-4 md:pt-8"
              aria-label="نشان‌های اعتماد"
            >
              {site.footer.trustBadges.map((badge) => (
                <a
                  key={badge.id}
                  href={badge.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="shrink-0"
                  aria-label={badge.alt}
                >
                  <SiteImage
                    src={TRUST_BADGE_MEDIA[badge.id]}
                    alt={badge.alt}
                    width={72}
                    height={72}
                    className="h-[4.25rem] w-[4.25rem] rounded-xl border border-bone/10 bg-bone/5 object-contain p-2 transition-colors hover:border-bone/20 md:h-[4.75rem] md:w-[4.75rem]"
                  />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-5 md:col-span-7 md:gap-x-12 md:gap-y-8">
            <div className="min-w-0">
              <h3 className="text-caption font-medium uppercase leading-tight tracking-[0.12em] text-gold md:tracking-[0.2em]">
                {site.footer.navTitle}
              </h3>
              <ul className="mt-2 space-y-1 md:mt-5 md:space-y-3">
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
            </div>

            <div className="min-w-0">
              <h3 className="text-caption font-medium uppercase leading-tight tracking-[0.12em] text-gold md:tracking-[0.2em]">
                {site.footer.contactTitle}
              </h3>
              <ul className="mt-2 space-y-1 md:mt-5 md:space-y-3">
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
            </div>
          </div>
        </div>

        <Divider className="mt-6 opacity-80 md:mt-12 md:opacity-100" />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:mt-8">
          <p className="text-caption leading-snug text-mist">
            © {year} {site.founder}. تمامی حقوق محفوظ است.
          </p>
          <nav aria-label="حقوقی" className="flex shrink-0 gap-4 md:gap-6">
            <Link
              href="/legal/privacy"
              className="text-caption text-mist hover:text-bone"
            >
              حریم خصوصی
            </Link>
            <Link
              href="/legal/terms"
              className="text-caption text-mist hover:text-bone"
            >
              قوانین
            </Link>
            <Link
              href="/legal/cookies"
              className="text-caption text-mist hover:text-bone"
            >
              کوکی‌ها
            </Link>
            <Link
              href="/legal/data-request"
              className="text-caption text-mist hover:text-bone"
            >
              درخواست داده
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
