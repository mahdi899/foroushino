import localFont from "next/font/local";

/**
 * IRANSansXFaNum — static weights under `public/fonts/IRANSansXFaNum/`.
 *
 * Apply `fontVariable` on <html> and `fontClassName` on <body> so @font-face loads
 * and `--font-iransans` is available to Tailwind tokens on :root descendants.
 */
const iranSans = localFont({
  src: [
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-Thin.woff2", weight: "100", style: "normal" },
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-UltraLight.woff2", weight: "200", style: "normal" },
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-Light.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-DemiBold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-Bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-ExtraBold.woff2", weight: "800", style: "normal" },
    { path: "../public/fonts/IRANSansXFaNum/IRANSansXFaNum-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-iransans",
  display: "swap",
  preload: true,
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

/** CSS variable for Tailwind `@theme` tokens (`--font-body`, `--font-display`). */
export const fontVariable = iranSans.variable;

/** Applies IRANSansXFaNum directly + injects all `@font-face` rules. */
export const fontClassName = iranSans.className;

/** @deprecated Use `fontVariable` — kept for one release of import stability. */
export const fontVariables = fontVariable;
