import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";

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
    <section className={cn("page-hero", className)}>
      <div className="page-hero__mesh" aria-hidden />
      <div className="container-luxe page-hero__container">
        <div className="page-hero__content">
          {backLink ? (
            <Reveal>
              <Link href={backLink.href} className="page-hero__back">
                <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
                {backLink.label}
              </Link>
            </Reveal>
          ) : null}

          <div className={cn("page-hero__main", backLink && "page-hero__main--with-back")}>
            <div className="page-hero__primary">
              {eyebrow ? (
                <Reveal delay={backLink ? 0.04 : 0}>
                  <Eyebrow>{eyebrow}</Eyebrow>
                </Reveal>
              ) : null}
              <Reveal delay={backLink ? 0.08 : 0.06}>
                <h1 className="page-hero__title">{title}</h1>
              </Reveal>
            </div>

            {description ? (
              <Reveal delay={backLink ? 0.12 : 0.1}>
                <p className="page-hero__desc">{description}</p>
              </Reveal>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
