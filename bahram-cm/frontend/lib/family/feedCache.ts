import type { FamilyFeedMeta, FamilyPost } from '@/lib/family/types';

const DB_NAME = 'bahram-family';
const STORE = 'feed';
const DB_VERSION = 1;
const CACHE_SCHEMA_VERSION = 1;
const MAX_PAGES = 12;

export type FeedCachePage = {
  data: FamilyPost[];
  meta: FamilyFeedMeta;
};

export type FeedCacheRecord = {
  schemaVersion: typeof CACHE_SCHEMA_VERSION;
  savedAt: number;
  pages: FeedCachePage[];
};

function cacheKey(scope: string, viewerKey: string | number): string {
  return `${scope}:${String(viewerKey)}`;
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('indexedDB unavailable'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'));
  });
}

function idbGet<T>(key: string): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const request = tx.objectStore(STORE).get(key);
        request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
        request.onerror = () => reject(request.error ?? new Error('indexedDB get failed'));
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('indexedDB tx failed'));
        };
      }),
  );
}

function idbSet(key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('indexedDB put failed'));
        };
      }),
  );
}

export async function readFeedCache(
  scope: string,
  viewerKey: string | number,
): Promise<FeedCachePage[] | null> {
  try {
    const record = await idbGet<FeedCacheRecord>(cacheKey(scope, viewerKey));
    if (!record || record.schemaVersion !== CACHE_SCHEMA_VERSION) return null;
    if (!Array.isArray(record.pages) || record.pages.length === 0) return null;
    return record.pages.slice(0, MAX_PAGES);
  } catch {
    return null;
  }
}

export async function writeFeedCache(
  scope: string,
  viewerKey: string | number,
  pages: FeedCachePage[],
): Promise<void> {
  if (!pages.length) return;
  try {
    const record: FeedCacheRecord = {
      schemaVersion: CACHE_SCHEMA_VERSION,
      savedAt: Date.now(),
      pages: pages.slice(0, MAX_PAGES),
    };
    await idbSet(cacheKey(scope, viewerKey), record);
  } catch {
    // Best-effort — feed still works without persistence.
  }
}

export async function clearFeedCache(scope: string, viewerKey: string | number): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(cacheKey(scope, viewerKey));
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('indexedDB delete failed'));
      };
    });
  } catch {
    /* ignore */
  }
}
