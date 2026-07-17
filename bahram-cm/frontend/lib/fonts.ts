import localFont from "next/font/local";

/**
 * IRANSansXFaNum — production subset: weights used across the site.
 */
const iranSans = localFont({
  src: [
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-DemiBold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-iransans",
  display: "swap",
  preload: true,
  fallback: ["IRANSansXFaNum", "Tahoma", "sans-serif"],
});

/** Canonical site font stack — IRANSansXFaNum from public/fonts only. */
export const SITE_FONT_STACK =
  'var(--font-iransans), IRANSansXFaNum, Tahoma, sans-serif';

/** CSS variable for Tailwind `@theme` tokens (`--font-body`, `--font-display`). */
export const fontVariable = iranSans.variable;

/** Applies IRANSansXFaNum directly + injects all `@font-face` rules. */
export const fontClassName = iranSans.className;

/** @deprecated Use `fontVariable` — kept for one release of import stability. */
export const fontVariables = fontVariable;
