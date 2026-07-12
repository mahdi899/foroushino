import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
  const icon = (
    <span className="insight-hero-adjacent__icon" aria-hidden>
      <ArrowLeft
        className={cn("h-4 w-4 rtl-flip", direction === "next" && "rotate-180")}
        strokeWidth={1.75}
      />
    </span>
  );

  return (
    <Link
      href={href}
      className={cn(
        "insight-hero-adjacent group",
        direction === "prev" ? "insight-hero-adjacent--prev" : "insight-hero-adjacent--next",
      )}
    >
      {direction === "next" ? icon : null}
      <span className="insight-hero-adjacent__title">{title}</span>
      {direction === "prev" ? icon : null}
    </Link>
  );
}
