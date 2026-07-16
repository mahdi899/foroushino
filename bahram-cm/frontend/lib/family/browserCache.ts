'use client';

import { mutate as globalMutate } from 'swr';
import { clearFeedCache, readFeedCache, writeFeedCache, type FeedCachePage } from '@/lib/family/feedCache';
import {
  mergeFeedBrandingIntoCurrent,
  readFamilyShellSnapshot,
  shellStorageKey,
  writeFamilyShellSnapshot,
} from '@/lib/family/shellCache';
import type { FamilyBranding } from '@/lib/family/types';
import type { FamilyFeedUpdatedPayload } from '@/lib/family/hooks/useFamilyRealtime';

export type FamilyCacheSection = 'feed' | 'branding' | 'shell' | 'pinned' | 'unread';

export type FamilyCacheInvalidateMessage = {
  section: FamilyCacheSection | 'all';
  key?: string;
};

const BROADCAST_CHANNEL = 'bahram-family-cache';

function isFamilyFeedKey(key: unknown): boolean {
  return Array.isArray(key) && key[0] === 'family-feed';
}

function isFamilyPinnedKey(key: unknown): boolean {
  return key === 'family-pinned' || (Array.isArray(key) && key[0] === 'family-pinned');
}

function isFeedUnreadKey(key: unknown): boolean {
  return Array.isArray(key) && key[0] === 'family-feed-unread-summary';
}

function isBrandingKey(key: unknown): boolean {
  return key === 'family-branding';
}

let broadcastChannel: BroadcastChannel | null = null;
const invalidateListeners = new Set<(message: FamilyCacheInvalidateMessage) => void>();

async function applyRemoteInvalidate(message: FamilyCacheInvalidateMessage): Promise<void> {
  if (message.section === 'all') {
    const viewerKey = message.key ?? 'global';
    await clearFeedCache('guest', viewerKey);
    await clearFeedCache('member', viewerKey);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(shellStorageKey(viewerKey));
      } catch {
        /* ignore */
      }
    }
    void globalMutate(isFamilyFeedKey, undefined, { revalidate: true });
    void globalMutate(isBrandingKey, undefined, { revalidate: true });
    void globalMutate(isFamilyPinnedKey);
    void globalMutate(isFeedUnreadKey);
    return;
  }

  if (message.section === 'feed' && message.key) {
    const parsed = parseFeedKey(message.key);
    if (parsed) await clearFeedCache(parsed.scope, parsed.viewerKey);
    revalidateSwrSection('feed');
    return;
  }

  if (message.section === 'shell' || message.section === 'branding') {
    const viewerKey = message.key ?? 'global';
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(shellStorageKey(viewerKey));
      } catch {
        /* ignore */
      }
    }
    revalidateSwrSection(message.section);
    return;
  }

  revalidateSwrSection(message.section);
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);
    broadcastChannel.onmessage = (event: MessageEvent<FamilyCacheInvalidateMessage>) => {
      const message = event.data;
      if (!message?.section) return;
      void applyRemoteInvalidate(message);
      invalidateListeners.forEach((listener) => listener(message));
    };
  }
  return broadcastChannel;
}

function broadcastInvalidate(message: FamilyCacheInvalidateMessage): void {
  getBroadcastChannel()?.postMessage(message);
}

export function subscribeFamilyCacheInvalidation(
  listener: (message: FamilyCacheInvalidateMessage) => void,
): () => void {
  getBroadcastChannel();
  invalidateListeners.add(listener);
  return () => {
    invalidateListeners.delete(listener);
  };
}

function parseFeedKey(key: string): { scope: 'guest' | 'member'; viewerKey: string } | null {
  const [scope, viewerKey] = key.split(':');
  if ((scope !== 'guest' && scope !== 'member') || !viewerKey) return null;
  return { scope, viewerKey };
}

function revalidateSwrSection(section: FamilyCacheSection): void {
  switch (section) {
    case 'feed':
      void globalMutate(isFamilyFeedKey, undefined, { revalidate: true });
      break;
    case 'branding':
      void globalMutate(isBrandingKey, undefined, { revalidate: true });
      break;
    case 'pinned':
      void globalMutate(isFamilyPinnedKey);
      break;
    case 'unread':
      void globalMutate(isFeedUnreadKey);
      break;
    case 'shell':
      void globalMutate(isBrandingKey, undefined, { revalidate: true });
      break;
    default:
      break;
  }
}

export async function invalidateFamilyCacheSection(
  section: FamilyCacheSection,
  key?: string,
  options?: { revalidate?: boolean; broadcast?: boolean },
): Promise<void> {
  const revalidate = options?.revalidate ?? true;
  const shouldBroadcast = options?.broadcast ?? true;

  if (section === 'feed' && key) {
    const parsed = parseFeedKey(key);
    if (parsed) {
      await clearFeedCache(parsed.scope, parsed.viewerKey);
    }
  }

  if (section === 'shell' || section === 'branding') {
    const viewerKey = key ?? 'global';
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(shellStorageKey(viewerKey));
      } catch {
        /* ignore */
      }
    }
  }

  if (revalidate) {
    revalidateSwrSection(section);
  }

  if (shouldBroadcast) {
    broadcastInvalidate({ section, key });
  }
}

export async function invalidateAllFamilyBrowserCache(
  viewerKey: string | number = 'global',
): Promise<void> {
  await clearFeedCache('guest', viewerKey);
  await clearFeedCache('member', viewerKey);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(shellStorageKey(viewerKey));
      window.localStorage.removeItem(shellStorageKey('global'));
    } catch {
      /* ignore */
    }
  }

  void globalMutate(isFamilyFeedKey, undefined, { revalidate: true });
  void globalMutate(isBrandingKey, undefined, { revalidate: true });
  void globalMutate(isFamilyPinnedKey);
  void globalMutate(isFeedUnreadKey);

  broadcastInvalidate({ section: 'all', key: String(viewerKey) });
}

export async function readFeedBrowserCache(
  scope: 'guest' | 'member',
  viewerKey: string | number,
  expectedRevision?: number | null,
): Promise<FeedCachePage[] | null> {
  const record = await readFeedCache(scope, viewerKey);
  if (!record) return null;
  if (
    expectedRevision != null &&
    record.revision != null &&
    record.revision !== expectedRevision
  ) {
    return null;
  }
  return record.pages;
}

export async function writeFeedBrowserCache(
  scope: 'guest' | 'member',
  viewerKey: string | number,
  pages: FeedCachePage[],
  revision?: number | null,
): Promise<void> {
  await writeFeedCache(scope, viewerKey, pages, revision ?? null);
}

export function readBrandingBrowserCache(
  viewerKey: string | number = 'global',
): FamilyBranding | null {
  return readFamilyShellSnapshot(viewerKey)?.branding ?? null;
}

export function writeBrandingBrowserCache(
  partial: { branding?: FamilyBranding; memberCount?: number },
  viewerKey: string | number = 'global',
): void {
  writeFamilyShellSnapshot(partial, viewerKey);
}

/** Route realtime feed events to minimal browser + SWR invalidation. */
export function invalidateOnFamilyFeedEvent(payload: FamilyFeedUpdatedPayload): void {
  const event = payload.event ?? 'published';

  void globalMutate(isFeedUnreadKey);

  switch (event) {
    case 'pinned':
    case 'unpinned':
      void invalidateFamilyCacheSection('pinned', undefined, { revalidate: true, broadcast: true });
      break;
    case 'deleted':
    case 'archived':
      void invalidateFamilyCacheSection('pinned', undefined, { revalidate: true, broadcast: false });
      break;
    case 'published':
    case 'updated':
    default:
      break;
  }
}

export function mergeBrandingFromFeed(
  current: FamilyBranding | undefined,
  fromFeed: FamilyBranding,
): FamilyBranding {
  return mergeFeedBrandingIntoCurrent(current, fromFeed);
}

export function feedBrowserCacheKey(scope: 'guest' | 'member', viewerKey: string | number): string {
  return `${scope}:${String(viewerKey)}`;
}
