import localFont from "next/font/local";

/**
 * Yekan Bakh — static weights under `public/fonts/`.
 * Weights 100/200 reuse Light; 600 reuses Medium so `font-semibold` matches a real face.
 */
const yekanBakh = localFont({
  src: [
    { path: "../public/fonts/YekanBakh_Light.ttf", weight: "100", style: "normal" },
    { path: "../public/fonts/YekanBakh_Light.ttf", weight: "200", style: "normal" },
    { path: "../public/fonts/YekanBakh_Light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/Yekan Bakh.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/YekanBakh-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/YekanBakh-Medium.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/YekanBakh-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/YekanBakh-Heavy.ttf", weight: "800", style: "normal" },
    { path: "../public/fonts/YekanBakh-Fat.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-yekan-bakh",
  display: "swap",
});

/** Sets `--font-yekan-bakh` for use in `@theme` (see globals.css). */
export const fontVariables = yekanBakh.variable;
