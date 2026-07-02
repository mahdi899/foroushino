/** Theme + tone → RGB 0–1 for Lottie `c.k` vectors (matches globals.css tokens). */
export type LottieThemeMode = "light" | "dark";
export type LottieBrandTone = "emerald" | "gold" | "bone";

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function brandRgbForLottie(
  tone: LottieBrandTone,
  theme: LottieThemeMode,
): [number, number, number] {
  const dark = theme === "dark";
  switch (tone) {
    case "gold":
      return dark ? hexToRgb01("#c5a46b") : hexToRgb01("#6e5a3a");
    case "bone":
      return dark ? hexToRgb01("#f4efe8") : hexToRgb01("#0b1016");
    default:
      return dark ? hexToRgb01("#4dd4a8") : hexToRgb01("#1e9d75");
  }
}

function isBlackStrokeOrFill(k: unknown): k is [number, number, number, ...number[]] {
  if (!Array.isArray(k) || k.length < 4) return false;
  const [r, g, b] = k;
  return typeof r === "number" && typeof g === "number" && typeof b === "number" && r < 0.04 && g < 0.04 && b < 0.04;
}

/** Thinner strokes on Lottie tiles (`ty: "st"` → `w`). */
const LOTTIE_STROKE_WIDTH_FACTOR = 0.52;

function scaleStrokeWidthValue(original: number, factor: number): number {
  if (original === 0) return 0;
  return Math.max(0.75, original * factor);
}

function scaleStrokeWidthProp(w: unknown, factor: number): void {
  if (!w || typeof w !== "object") return;
  const o = w as Record<string, unknown>;
  if (o.a === 0 && typeof o.k === "number") {
    o.k = scaleStrokeWidthValue(o.k, factor);
    return;
  }
  if (o.a === 1 && Array.isArray(o.k)) {
    for (const frame of o.k) {
      if (!frame || typeof frame !== "object") continue;
      const fr = frame as Record<string, unknown>;
      if (typeof fr.s === "number") {
        fr.s = scaleStrokeWidthValue(fr.s, factor);
        continue;
      }
      if (Array.isArray(fr.s) && typeof fr.s[0] === "number") {
        const s = fr.s as number[];
        s[0] = scaleStrokeWidthValue(s[0], factor);
      }
    }
  }
}

function applyColorKey(
  c: Record<string, unknown>,
  rgb: [number, number, number],
): void {
  const alpha = (k: number[]) => (typeof k[3] === "number" ? k[3] : 1);
  if (c.a === 0 && Array.isArray(c.k) && isBlackStrokeOrFill(c.k)) {
    const k = c.k as number[];
    c.k = [rgb[0], rgb[1], rgb[2], alpha(k)];
    return;
  }
  if (c.a === 1 && Array.isArray(c.k)) {
    for (const frame of c.k) {
      if (!frame || typeof frame !== "object") continue;
      const fr = frame as Record<string, unknown>;
      if (!Array.isArray(fr.s)) continue;
      if (isBlackStrokeOrFill(fr.s)) {
        const s = fr.s as number[];
        fr.s = [rgb[0], rgb[1], rgb[2], alpha(s)];
      }
    }
  }
}

/** Recolor near-black Lottie strokes/fills (e.g. lottie-icons) to brand tokens. */
export function tintLottieBlackToBrand(
  data: object,
  tone: LottieBrandTone,
  theme: LottieThemeMode,
): object {
  const rgb = brandRgbForLottie(tone, theme);
  const clone = structuredClone(data) as Record<string, unknown>;

  const walk = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const o = node as Record<string, unknown>;
    if (o.ty === "st" && o.w) scaleStrokeWidthProp(o.w, LOTTIE_STROKE_WIDTH_FACTOR);
    if (Object.prototype.hasOwnProperty.call(o, "c") && o.c && typeof o.c === "object") {
      applyColorKey(o.c as Record<string, unknown>, rgb);
    }
    for (const v of Object.values(o)) walk(v);
  };

  walk(clone);
  return clone;
}
