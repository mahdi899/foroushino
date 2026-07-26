/**
 * Self-hosted Noto Emoji Animation Lottie payloads (lazy-loaded).
 * @see https://googlefonts.github.io/noto-emoji-animation/
 *
 * JSON is loaded on demand so the family feed boot graph stays small.
 * Keep keys in sync with `scripts/download-noto-emojis.mjs` and `NOTO_CODEPOINT_BY_SLUG`.
 */

type LottieModule = { default: object } | object;

const NOTO_LOTTIE_LOADERS: Record<string, () => Promise<LottieModule>> = {
  smile: () => import('@/assets/lottie/noto/smile.json'),
  'slight-smile': () => import('@/assets/lottie/noto/slight-smile.json'),
  grin: () => import('@/assets/lottie/noto/grin.json'),
  pray: () => import('@/assets/lottie/noto/pray.json'),
  heart: () => import('@/assets/lottie/noto/heart.json'),
  'thumbs-up': () => import('@/assets/lottie/noto/thumbs-up.json'),
  book: () => import('@/assets/lottie/noto/book.json'),
  sparkles: () => import('@/assets/lottie/noto/sparkles.json'),
  'green-heart': () => import('@/assets/lottie/noto/green-heart.json'),
  star: () => import('@/assets/lottie/noto/star.json'),
  wave: () => import('@/assets/lottie/noto/wave.json'),
  speech: () => import('@/assets/lottie/noto/speech.json'),
  fire: () => import('@/assets/lottie/noto/fire.json'),
  clap: () => import('@/assets/lottie/noto/clap.json'),
  laugh: () => import('@/assets/lottie/noto/laugh.json'),
  sad: () => import('@/assets/lottie/noto/sad.json'),
  party: () => import('@/assets/lottie/noto/party.json'),
  rocket: () => import('@/assets/lottie/noto/rocket.json'),
  eyes: () => import('@/assets/lottie/noto/eyes.json'),
  muscle: () => import('@/assets/lottie/noto/muscle.json'),
  hundred: () => import('@/assets/lottie/noto/hundred.json'),
  wink: () => import('@/assets/lottie/noto/wink.json'),
  target: () => import('@/assets/lottie/noto/target.json'),
  'speaking-head': () => import('@/assets/lottie/noto/speaking-head.json'),
  camera: () => import('@/assets/lottie/noto/camera.json'),
  gift: () => import('@/assets/lottie/noto/gift.json'),
  'check-mark': () => import('@/assets/lottie/noto/check-mark.json'),
  'sparkling-heart': () => import('@/assets/lottie/noto/sparkling-heart.json'),
  'musical-notes': () => import('@/assets/lottie/noto/musical-notes.json'),
};

const cache = new Map<string, object>();
const inflight = new Map<string, Promise<object | null>>();

function unwrapLottieModule(mod: LottieModule): object {
  if (mod && typeof mod === 'object' && 'default' in mod && mod.default) {
    return mod.default as object;
  }
  return mod as object;
}

export function hasNotoLottieSlug(slug: string): boolean {
  return slug in NOTO_LOTTIE_LOADERS;
}

/** Sync peek — only returns data already loaded into memory. */
export function getNotoLottie(slug: string): object | null {
  return cache.get(slug) ?? null;
}

export async function loadNotoLottie(slug: string): Promise<object | null> {
  const hit = cache.get(slug);
  if (hit) return hit;

  const pending = inflight.get(slug);
  if (pending) return pending;

  const loader = NOTO_LOTTIE_LOADERS[slug];
  if (!loader) return null;

  const task = loader()
    .then((mod) => {
      const data = unwrapLottieModule(mod);
      cache.set(slug, data);
      inflight.delete(slug);
      return data;
    })
    .catch(() => {
      inflight.delete(slug);
      return null;
    });

  inflight.set(slug, task);
  return task;
}
