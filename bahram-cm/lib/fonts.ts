import localFont from "next/font/local";

/**
 * Yekan Bakh — static weights under `public/fonts/`.
 * Weights 100/200 reuse Light; 600 reuses Medium so `font-semibold` matches a real face.
 *
 * Apply `fontVariable` on <html> and `fontClassName` on <body> so @font-face loads
 * and `--font-yekan-bakh` is available to Tailwind tokens on :root descendants.
 */
const yekanBakh = localFont({
  src: [
    { path: "../public/fonts/YekanBakh_Light.ttf", weight: "100", style: "normal" },
    { path: "../public/fonts/YekanBakh_Light.ttf", weight: "200", style: "normal" },
    { path: "../public/fonts/YekanBakh_Light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/YekanBakh-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/YekanBakh-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/YekanBakh-Medium.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/YekanBakh-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/YekanBakh-Heavy.ttf", weight: "800", style: "normal" },
    { path: "../public/fonts/YekanBakh-Fat.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-yekan-bakh",
  display: "swap",
  preload: true,
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

/** CSS variable for Tailwind `@theme` tokens (`--font-body`, `--font-display`). */
export const fontVariable = yekanBakh.variable;

/** Applies Yekan Bakh directly + injects all `@font-face` rules. */
export const fontClassName = yekanBakh.className;

/** @deprecated Use `fontVariable` — kept for one release of import stability. */
export const fontVariables = fontVariable;
