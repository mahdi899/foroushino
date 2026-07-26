import { FAMILY_FEED_MEDIA_WARM_MAX_CONCURRENT } from '@/lib/family/feedUx';
import {
  resolveFamilyMediaPosterUrl,
  resolveFamilyMediaUrl,
} from '@/lib/family/mediaPlaybackUrl';
import type { FamilyPost, FamilyPostBlock } from '@/lib/family/types';

const warmedUrls = new Set<string>();
const MAX_CONCURRENT = FAMILY_FEED_MEDIA_WARM_MAX_CONCURRENT;
let inFlight = 0;
const queue: string[] = [];

function drainQueue(): void {
  if (typeof window === 'undefined') return;
  while (inFlight < MAX_CONCURRENT && queue.length > 0) {
    const url = queue.shift();
    if (!url) break;
    inFlight += 1;
    const img = new Image();
    img.decoding = 'async';
    const done = () => {
      inFlight -= 1;
      drainQueue();
    };
    img.onload = done;
    img.onerror = done;
    img.src = url;
  }
}

function enqueueWarmUrl(url: string | null | undefined): void {
  if (!url || warmedUrls.has(url)) return;
  warmedUrls.add(url);
  queue.push(url);
  drainQueue();
}

/** Fire-and-forget decode warmup for arbitrary URLs (e.g. story media). Jumps to
 * front of the queue since these are usually about-to-be-viewed (priority). */
export function warmupUrls(urls: (string | null | undefined)[]): void {
  if (typeof window === 'undefined') return;
  const priority: string[] = [];
  for (const url of urls) {
    if (!url || warmedUrls.has(url)) continue;
    warmedUrls.add(url);
    priority.push(url);
  }
  if (priority.length > 0) {
    queue.unshift(...priority);
  }
  drainQueue();
}

function mediaUrlsFromBlock(block: FamilyPostBlock): string[] {
  const urls: string[] = [];
  if (block.type !== 'image' && block.type !== 'video') return urls;
  const media = block.media;
  if (!media) return urls;

  if (block.type === 'image' && media.url) {
    const full = resolveFamilyMediaUrl(media.url);
    if (full) urls.push(full);
  }

  if (block.type === 'video') {
    const poster = resolveFamilyMediaPosterUrl(media.poster_url);
    if (poster) urls.push(poster);
  }

  return urls;
}

export function extractFamilyPostMediaUrls(post: FamilyPost): string[] {
  const urls: string[] = [];
  for (const block of post.blocks ?? []) {
    urls.push(...mediaUrlsFromBlock(block));
  }
  return urls;
}

/** Fire-and-forget decode warmup for a slice of posts (deduped per URL). */
export function warmupFamilyPostsMedia(posts: FamilyPost[], startIndex: number, count: number): void {
  if (typeof window === 'undefined' || count <= 0) return;
  const from = Math.max(0, startIndex);
  const slice = posts.slice(from, from + count);
  for (const post of slice) {
    for (const url of extractFamilyPostMediaUrls(post)) {
      enqueueWarmUrl(url);
    }
  }
}

export function warmupFamilyPostsWindow(
  posts: FamilyPost[],
  anchorIndex: number,
  before: number,
  after: number,
): void {
  const from = Math.max(0, anchorIndex - before);
  const count = before + after + 1;
  warmupFamilyPostsMedia(posts, from, count);
}

/** Extra warmup boost while flinging — widens the window in the scroll direction. */
export function warmupFamilyPostsWindowDirectional(
  posts: FamilyPost[],
  anchorIndex: number,
  before: number,
  after: number,
  scrollingUp: boolean,
): void {
  if (scrollingUp) {
    warmupFamilyPostsWindow(posts, anchorIndex, before * 2, after);
    return;
  }
  warmupFamilyPostsWindow(posts, anchorIndex, before, after * 2);
}

/** Rough post index from scroll offset (oldest post = index 0). */
export function estimatePostIndexFromScroll(
  posts: FamilyPost[],
  scrollTop: number,
  estimatePostHeight: (post: FamilyPost) => number,
): number {
  if (posts.length === 0) return 0;
  let acc = 0;
  for (let i = 0; i < posts.length; i += 1) {
    const h = Math.max(estimatePostHeight(posts[i]!), 72);
    if (acc + h > scrollTop) return i;
    acc += h;
  }
  return posts.length - 1;
}
