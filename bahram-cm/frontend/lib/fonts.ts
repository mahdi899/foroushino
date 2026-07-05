import localFont from "next/font/local";

/**
 * Peyda — static weights under `public/fonts/`.
 *
 * Apply `fontVariable` on <html> and `fontClassName` on <body> so @font-face loads
 * and `--font-peyda` is available to Tailwind tokens on :root descendants.
 */
const peyda = localFont({
  src: [
    { path: "../public/fonts/Peyda-Thin.ttf", weight: "100", style: "normal" },
    { path: "../public/fonts/peyda-extralight.ttf", weight: "200", style: "normal" },
    { path: "../public/fonts/peyda-light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/Peyda-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Peyda-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/Peyda-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/Peyda-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/Peyda-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "../public/fonts/Peyda-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-peyda",
  display: "swap",
  preload: true,
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

/** CSS variable for Tailwind `@theme` tokens (`--font-body`, `--font-display`). */
export const fontVariable = peyda.variable;

/** Applies Peyda directly + injects all `@font-face` rules. */
export const fontClassName = peyda.className;

/** @deprecated Use `fontVariable` — kept for one release of import stability. */
export const fontVariables = fontVariable;
