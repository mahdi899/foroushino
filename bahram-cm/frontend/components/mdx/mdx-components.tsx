import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { SiteImage } from "@/components/ui/SiteImage";
import { cn } from "@/lib/cn";

/**
 * Luxe-styled MDX component map. Applied to all rendered MDX bodies so markdown
 * features (headings, links, lists, quotes, code, tables) render with the site's
 * design language instead of being flattened to paragraphs.
 */

function Callout({
  children,
  tone = "emerald",
  title,
}: {
  children: ReactNode;
  tone?: "emerald" | "gold";
  title?: string;
}) {
  return (
    <aside
      className={cn(
        "my-7 rounded-card border p-5 md:p-6",
        tone === "gold"
          ? "border-gold/30 bg-gold/8"
          : "border-emerald/30 bg-emerald/8",
      )}
    >
      {title ? (
        <p
          className={cn(
            "mb-2 text-caption uppercase tracking-[0.2em]",
            tone === "gold" ? "text-gold" : "text-emerald-glow",
          )}
        >
          {title}
        </p>
      ) : null}
      <div className="text-bone-dim [&>p]:m-0 [&>p+p]:mt-3">{children}</div>
    </aside>
  );
}

export const mdxComponents: MDXComponents = {
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1 className="mt-10 text-h1 text-balance text-bone first:mt-0" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="mt-12 scroll-mt-24 text-h2 text-balance text-bone first:mt-0" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-9 scroll-mt-24 text-h3 text-balance text-bone first:mt-0" {...props} />
  ),
  h4: (props: ComponentPropsWithoutRef<"h4">) => (
    <h4 className="mt-7 text-lg font-semibold text-bone first:mt-0" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mb-5 text-base leading-8 text-bone-dim md:text-lg md:leading-9" {...props} />
  ),
  a: ({ href = "#", ...props }: ComponentPropsWithoutRef<"a">) => {
    const isInternal = href.startsWith("/");
    const className =
      "text-gold underline decoration-gold/40 underline-offset-4 transition-colors hover:text-gold-soft";
    if (isInternal) {
      return <Link href={href} className={className} {...props} />;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        {...props}
      />
    );
  },
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="mb-6 ms-5 list-disc space-y-2 text-bone-dim marker:text-gold/60" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="mb-6 ms-5 list-decimal space-y-2 text-bone-dim marker:text-gold/70" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="text-base leading-8 md:text-lg" {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="my-7 border-s-2 border-gold/50 ps-5 text-lg italic text-bone md:text-xl"
      {...props}
    />
  ),
  hr: () => <hr className="my-10 border-bone/10" />,
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-bone" {...props} />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code
      dir="ltr"
      className="rounded bg-charcoal/70 px-1.5 py-0.5 text-[0.9em] text-emerald-glow"
      {...props}
    />
  ),
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      dir="ltr"
      className="my-7 overflow-x-auto rounded-card border border-bone/10 bg-obsidian/80 p-5 text-sm leading-7 text-bone [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-bone"
      {...props}
    />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-7 overflow-x-auto rounded-card border border-bone/10">
      <table className="w-full border-collapse text-start text-bone-dim" {...props} />
    </div>
  ),
  thead: (props: ComponentPropsWithoutRef<"thead">) => (
    <thead className="bg-charcoal/60 text-bone" {...props} />
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th className="border-b border-bone/10 px-4 py-3 text-start text-caption font-semibold" {...props} />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="border-b border-bone/8 px-4 py-3 align-top" {...props} />
  ),
  img: ({ src, alt = "" }: ComponentPropsWithoutRef<"img">) => (
    <span className="my-7 block overflow-hidden rounded-card border border-bone/10">
      <SiteImage
        src={typeof src === "string" ? src : ""}
        alt={alt}
        fallbackAlt="تصویر مقاله"
        width={1200}
        height={675}
        sizes="(max-width: 768px) 100vw, 768px"
        className="h-auto w-full object-cover"
      />
    </span>
  ),
  Callout,
};
