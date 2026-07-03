import Link from "next/link";
import { site } from "@/content/site";
import { Divider } from "@/components/ui/Divider";
import { NewsletterForm } from "@/components/ui/NewsletterForm";
import { Logo } from "./Logo";
import { toPersianDigits } from "@/lib/persian";

export function SiteFooter() {
  const year = toPersianDigits(new Date().getFullYear());

  return (
    <footer className="relative border-t border-bone/5 bg-obsidian">
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
            <div className="mt-5 max-w-none border-t border-bone/10 pt-5 md:mt-8 md:max-w-sm md:pt-8">
              <p className="mb-1.5 text-caption uppercase leading-snug tracking-[0.14em] text-gold md:mb-3 md:tracking-[0.2em]">
                خبرنامه
              </p>
              <NewsletterForm density="compact" className="w-full min-w-0" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-3 gap-y-5 md:col-span-7 md:grid-cols-3 md:gap-x-8 md:gap-y-8">
            {site.footer.columns.map((col) => (
              <div key={col.title} className="min-w-0">
                <h3 className="text-caption font-medium uppercase leading-tight tracking-[0.12em] text-gold md:tracking-[0.2em]">
                  {col.title}
                </h3>
                <ul className="mt-2 space-y-1 md:mt-5 md:space-y-3">
                  {col.links.map((link) => (
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
            ))}
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
