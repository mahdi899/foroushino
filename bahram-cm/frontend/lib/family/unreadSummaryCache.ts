import type { FeedUnreadSummary } from '@/lib/family/api';

let lastSummary: FeedUnreadSummary = { unread_count: 0, latest_post_id: 0 };
let lastEtag: string | null = null;

export function getUnreadSummaryEtag(): string | null {
  return lastEtag;
}

export function rememberUnreadSummary(data: FeedUnreadSummary, etag: string | null): FeedUnreadSummary {
  lastSummary = data;
  lastEtag = etag;
  return data;
}

export function getCachedUnreadSummary(): FeedUnreadSummary {
  return lastSummary;
}
