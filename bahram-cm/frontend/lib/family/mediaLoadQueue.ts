type MediaLoadPriority = 'preview' | 'full';

type QueueItem = {
  priority: number;
  mediaId: number;
  task: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};

const PRIORITY: Record<MediaLoadPriority, number> = {
  full: 20,
  preview: 10,
};

const MAX_CONCURRENT = 2;
const previewDone = new Set<number>();
const inFlight = new Set<number>();
const waiters = new Map<number, Array<{ resolve: () => void; reject: (error: unknown) => void }>>();

let active = 0;
const queue: QueueItem[] = [];

function isMediaQueued(mediaId: number): boolean {
  return inFlight.has(mediaId) || queue.some((item) => item.mediaId === mediaId);
}

function notifyWaiters(mediaId: number, error?: unknown) {
  const list = waiters.get(mediaId);
  if (!list) return;
  waiters.delete(mediaId);

  for (const waiter of list) {
    if (error) waiter.reject(error);
    else waiter.resolve();
  }
}

function pump() {
  queue.sort((a, b) => b.priority - a.priority);

  while (active < MAX_CONCURRENT && queue.length > 0) {
    const next = queue.shift();
    if (!next) break;

    active += 1;
    inFlight.add(next.mediaId);

    void next
      .task()
      .then((result) => {
        next.resolve(result);
        notifyWaiters(next.mediaId);
      })
      .catch((error) => {
        next.reject(error);
        notifyWaiters(next.mediaId, error);
      })
      .finally(() => {
        inFlight.delete(next.mediaId);
        active -= 1;
        pump();
      });
  }
}

function waitForMediaSlot(mediaId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const list = waiters.get(mediaId) ?? [];
    list.push({ resolve, reject });
    waiters.set(mediaId, list);
  });
}

export function hasFamilyMediaPreview(mediaId: number): boolean {
  return previewDone.has(mediaId);
}

export function markFamilyMediaPreviewDone(mediaId: number) {
  previewDone.add(mediaId);
}

export function enqueueFamilyMediaLoad<T>(
  priority: MediaLoadPriority,
  mediaId: number,
  task: () => Promise<T>,
): Promise<T> {
  if (priority === 'preview' && previewDone.has(mediaId)) {
    return Promise.resolve(undefined as T);
  }

  if (isMediaQueued(mediaId)) {
    return waitForMediaSlot(mediaId).then(() => undefined as T);
  }

  return new Promise<T>((resolve, reject) => {
    queue.push({
      priority: PRIORITY[priority],
      mediaId,
      task: async () => {
        const result = await task();
        if (priority === 'preview') {
          previewDone.add(mediaId);
        }
        return result;
      },
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    pump();
  });
}
