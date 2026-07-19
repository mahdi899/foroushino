import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function InsightAdjacentLink({
  href,
  title,
  direction,
}: {
  href: string;
  title: string;
  direction: "prev" | "next";
}) {
  const isPrev = direction === "prev";

  return (
    <Link
      href={href}
      className={cn(
        "insight-hero-adjacent group",
        isPrev ? "insight-hero-adjacent--prev" : "insight-hero-adjacent--next",
      )}
    >
      {!isPrev ? (
        <span className="insight-hero-adjacent__icon" aria-hidden>
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </span>
      ) : null}
      <span className="insight-hero-adjacent__body">
        <span className="insight-hero-adjacent__label">
          {isPrev ? "مقاله قبلی" : "مقاله بعدی"}
        </span>
        <span className="insight-hero-adjacent__title">{title}</span>
      </span>
      {isPrev ? (
        <span className="insight-hero-adjacent__icon" aria-hidden>
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </span>
      ) : null}
    </Link>
  );
}
