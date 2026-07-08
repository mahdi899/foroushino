import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";
import "@/styles/page-hero.css";

type BackLink = {
  href: string;
  label: string;
};

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  backLink?: BackLink;
  className?: string;
};

export function PageHero({ eyebrow, title, description, backLink, className }: Props) {
  return (
    <section
      className={cn(
        "page-hero page-hero--listing border-b border-bone/8 bg-ink",
        className,
      )}
    >
      <div className="container-luxe page-hero__container">
        {backLink ? (
          <Reveal>
            <Link
              href={backLink.href}
              className="page-hero__back mb-4 inline-flex items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft"
            >
              <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
              {backLink.label}
            </Link>
          </Reveal>
        ) : null}

        <div className="page-hero__inner mx-auto max-w-2xl text-center">
          {eyebrow ? (
            <Reveal delay={backLink ? 0.04 : 0}>
              <p className="page-hero__eyebrow">{eyebrow}</p>
            </Reveal>
          ) : null}

          <Reveal delay={backLink ? 0.08 : eyebrow ? 0.06 : 0}>
            <h1 className="page-hero__title">{title}</h1>
          </Reveal>

          {description ? (
            <Reveal delay={backLink ? 0.12 : eyebrow ? 0.1 : 0.06}>
              <p className="page-hero__desc">{description}</p>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
