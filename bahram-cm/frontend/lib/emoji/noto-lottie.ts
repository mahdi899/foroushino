/**
 * Self-hosted Noto Emoji Animation Lottie payloads.
 * @see https://googlefonts.github.io/noto-emoji-animation/
 */

const modules = import.meta.glob<object>('@/assets/lottie/noto/*.json', {
  eager: true,
  import: 'default',
});

const NOTO_LOTTIE_BY_SLUG: Record<string, object> = {};

for (const [path, data] of Object.entries(modules)) {
  const slug = path.match(/\/([^/]+)\.json$/)?.[1];
  if (slug && data) NOTO_LOTTIE_BY_SLUG[slug] = data;
}

export function hasNotoLottieSlug(slug: string): boolean {
  return slug in NOTO_LOTTIE_BY_SLUG;
}

export function getNotoLottie(slug: string): object | null {
  return NOTO_LOTTIE_BY_SLUG[slug] ?? null;
}

export const NOTO_LOTTIE = NOTO_LOTTIE_BY_SLUG;
