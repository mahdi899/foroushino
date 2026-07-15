/**
 * Self-hosted Noto Emoji Animation Lottie payloads.
 * @see https://googlefonts.github.io/noto-emoji-animation/
 *
 * Next.js does not support `import.meta.glob` — keep explicit imports in sync with
 * `scripts/download-noto-emojis.mjs` and `NOTO_CODEPOINT_BY_SLUG` in noto-registry.ts.
 */

import bookData from '@/assets/lottie/noto/book.json';
import cameraData from '@/assets/lottie/noto/camera.json';
import checkMarkData from '@/assets/lottie/noto/check-mark.json';
import clapData from '@/assets/lottie/noto/clap.json';
import eyesData from '@/assets/lottie/noto/eyes.json';
import fireData from '@/assets/lottie/noto/fire.json';
import giftData from '@/assets/lottie/noto/gift.json';
import grinData from '@/assets/lottie/noto/grin.json';
import greenHeartData from '@/assets/lottie/noto/green-heart.json';
import heartData from '@/assets/lottie/noto/heart.json';
import hundredData from '@/assets/lottie/noto/hundred.json';
import laughData from '@/assets/lottie/noto/laugh.json';
import muscleData from '@/assets/lottie/noto/muscle.json';
import musicalNotesData from '@/assets/lottie/noto/musical-notes.json';
import partyData from '@/assets/lottie/noto/party.json';
import prayData from '@/assets/lottie/noto/pray.json';
import rocketData from '@/assets/lottie/noto/rocket.json';
import sadData from '@/assets/lottie/noto/sad.json';
import slightSmileData from '@/assets/lottie/noto/slight-smile.json';
import smileData from '@/assets/lottie/noto/smile.json';
import sparklesData from '@/assets/lottie/noto/sparkles.json';
import sparklingHeartData from '@/assets/lottie/noto/sparkling-heart.json';
import speakingHeadData from '@/assets/lottie/noto/speaking-head.json';
import speechData from '@/assets/lottie/noto/speech.json';
import starData from '@/assets/lottie/noto/star.json';
import targetData from '@/assets/lottie/noto/target.json';
import thumbsUpData from '@/assets/lottie/noto/thumbs-up.json';
import waveData from '@/assets/lottie/noto/wave.json';
import winkData from '@/assets/lottie/noto/wink.json';

const NOTO_LOTTIE_BY_SLUG: Record<string, object> = {
  smile: smileData,
  'slight-smile': slightSmileData,
  grin: grinData,
  pray: prayData,
  heart: heartData,
  'thumbs-up': thumbsUpData,
  book: bookData,
  sparkles: sparklesData,
  'green-heart': greenHeartData,
  star: starData,
  wave: waveData,
  speech: speechData,
  fire: fireData,
  clap: clapData,
  laugh: laughData,
  sad: sadData,
  party: partyData,
  rocket: rocketData,
  eyes: eyesData,
  muscle: muscleData,
  hundred: hundredData,
  wink: winkData,
  target: targetData,
  'speaking-head': speakingHeadData,
  camera: cameraData,
  gift: giftData,
  'check-mark': checkMarkData,
  'sparkling-heart': sparklingHeartData,
  'musical-notes': musicalNotesData,
};

export function hasNotoLottieSlug(slug: string): boolean {
  return slug in NOTO_LOTTIE_BY_SLUG;
}

export function getNotoLottie(slug: string): object | null {
  return NOTO_LOTTIE_BY_SLUG[slug] ?? null;
}

export const NOTO_LOTTIE = NOTO_LOTTIE_BY_SLUG;
