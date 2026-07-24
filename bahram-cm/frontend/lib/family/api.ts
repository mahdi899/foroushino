'use server';

/**
 * Family API — Server Actions (not client fetch). The Sanctum token lives in
 * an httpOnly cookie (shared with the student panel), so authenticated calls
 * from client components must run server-side. See lib/student/panelActions.ts
 * for the same pattern used elsewhere in this app.
 */

import { extractError } from '@/lib/student/panelFormUtils';
import { FamilyApiError } from './errors';
import { familyFetch } from './session';
import type {
  FamilyBranding,
  FamilyComment,
  FamilyFeedResponse,
  FamilyMeResponse,
  FamilyNotification,
  FamilyPost,
  FamilyStory,
} from './types';

async function run<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 400;
    throw new FamilyApiError(extractError(err, fallback), status);
  }
}

export async function getPost(postId: number): Promise<{ data: FamilyPost }> {
  return run(() => familyFetch<{ data: FamilyPost }>(`/posts/${postId}`), 'دریافت پست ناموفق بود.');
}

export async function getFeed(
  cursor?: string | null,
  limit = 4,
  direction: 'older' | 'newer' = 'older',
): Promise<FamilyFeedResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  if (direction === 'newer') params.set('direction', 'newer');
  const qs = `?${params.toString()}`;
  return run(() => familyFetch<FamilyFeedResponse>(`/feed${qs}`), 'دریافت فید ناموفق بود.');
}

export async function getFeedUnreadSummary(
  afterId: number,
): Promise<{ data: { unread_count: number; latest_post_id: number; feed_revision?: number } }> {
  const qs = `?after_id=${Math.max(0, Math.floor(afterId))}`;
  return run(
    () => familyFetch<{ data: { unread_count: number; latest_post_id: number } }>(`/feed/unread-summary${qs}`),
    'دریافت پست‌های جدید ناموفق بود.',
  );
}

export async function getBranding(): Promise<{ data: FamilyBranding }> {
  return run(() => familyFetch<{ data: FamilyBranding }>(`/branding`), 'دریافت برندینگ ناموفق بود.');
}

export async function getStories(): Promise<{ data: FamilyStory[] }> {
  return run(() => familyFetch<{ data: FamilyStory[] }>(`/stories`), 'دریافت استوری‌ها ناموفق بود.');
}

export async function recordStoryView(storyId: number): Promise<{ data: { recorded: boolean } }> {
  return run(
    () => familyFetch<{ data: { recorded: boolean } }>(`/stories/${storyId}/view`, { method: 'POST' }),
    'ثبت بازدید استوری ناموفق بود.',
  );
}

export async function getPinnedPosts(): Promise<{ data: FamilyPost[] }> {
  return run(() => familyFetch<{ data: FamilyPost[] }>(`/pinned`), 'دریافت پیام سنجاق‌شده ناموفق بود.');
}

export type FamilyJumpResponse = {
  data: FamilyPost[];
  meta: {
    next_cursor: string | null;
    prev_cursor: string | null;
    has_newer: boolean;
    has_older: boolean;
    target_post_id: number;
  };
};

/** Chronological window centered on `postId` — for "jump to message" (e.g. an old pinned post). */
export async function getPostJumpContext(postId: number, limit = 24): Promise<FamilyJumpResponse> {
  const qs = `?limit=${Math.max(2, Math.floor(limit))}`;
  return run(
    () => familyFetch<FamilyJumpResponse>(`/posts/${postId}/jump${qs}`),
    'رفتن به پست ناموفق بود.',
  );
}

export async function joinFamily(entryContext: Record<string, string | undefined> = {}): Promise<{ data: FamilyMeResponse }> {
  return run(() => familyFetch(`/join`, { method: 'POST', body: entryContext }), 'پیوستن به خانواده ناموفق بود.');
}

export async function completeOnboarding(): Promise<{ data: FamilyMeResponse }> {
  return run(() => familyFetch(`/onboarding/complete`, { method: 'POST' }), 'تکمیل خوش‌آمدگویی ناموفق بود.');
}

export async function getMe(): Promise<{ data: FamilyMeResponse }> {
  return run(() => familyFetch(`/me`), 'دریافت اطلاعات ناموفق بود.');
}

export async function setReaction(postId: number, type: string): Promise<{ data: FamilyPost }> {
  return run(() => familyFetch(`/posts/${postId}/reaction`, { method: 'PUT', body: { type } }), 'ثبت واکنش ناموفق بود.');
}

export async function removeReaction(postId: number): Promise<{ data: { removed: boolean } }> {
  return run(() => familyFetch(`/posts/${postId}/reaction`, { method: 'DELETE' }), 'حذف واکنش ناموفق بود.');
}

export async function getComments(
  postId: number,
  cursor?: string | null,
): Promise<{ data: FamilyComment[]; meta: { next_cursor: string | null } }> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return run(() => familyFetch(`/posts/${postId}/comments${qs}`), 'دریافت نظرات ناموفق بود.');
}

export async function postComment(postId: number, body: string): Promise<{ data: FamilyComment }> {
  return run(() => familyFetch(`/posts/${postId}/comments`, { method: 'POST', body: { body } }), 'ارسال نظر ناموفق بود.');
}

export async function respondToAction(actionId: number, value: Record<string, unknown>): Promise<{ data: unknown }> {
  return run(() => familyFetch(`/actions/${actionId}/respond`, { method: 'POST', body: value }), 'ثبت پاسخ ناموفق بود.');
}

export async function recordPostView(postId: number): Promise<{ data: { views: number } }> {
  try {
    return await familyFetch(`/posts/${postId}/view`, { method: 'POST' });
  } catch {
    return { data: { views: 0 } };
  }
}

export async function sendMediaProgress(payload: {
  post_id: number;
  media_id: number;
  position: number;
  duration?: number;
  event?: string;
}): Promise<void> {
  try {
    await familyFetch(`/media-progress`, { method: 'POST', body: payload });
  } catch {
    // Best-effort telemetry — never block playback UX on failure.
  }
}

export async function getNotifications(): Promise<{ data: FamilyNotification[] }> {
  return run(() => familyFetch(`/notifications`), 'دریافت اعلان‌ها ناموفق بود.');
}

export async function getUnreadNotificationCount(): Promise<{ data: { unread_count: number } }> {
  return run(() => familyFetch(`/notifications/unread-count`), 'دریافت تعداد اعلان‌ها ناموفق بود.');
}

export async function markNotificationRead(id: number): Promise<void> {
  await run(() => familyFetch(`/notifications/${id}/read`, { method: 'POST' }), 'ثبت اعلان ناموفق بود.');
}

export async function markAllNotificationsRead(): Promise<void> {
  await run(() => familyFetch(`/notifications/read-all`, { method: 'POST' }), 'ثبت اعلان‌ها ناموفق بود.');
}

export async function getFamilyPushVapidPublicKey(): Promise<{ data: { public_key: string } }> {
  return run(
    () => familyFetch<{ data: { public_key: string } }>(`/push/vapid-public-key`),
    'دریافت کلید اعلان ناموفق بود.',
  );
}

export async function getFamilyPushStatus(): Promise<{
  data: { subscribed: boolean; configured: boolean; count: number };
}> {
  return run(
    () =>
      familyFetch<{ data: { subscribed: boolean; configured: boolean; count: number } }>(`/push/status`),
    'دریافت وضعیت اعلان ناموفق بود.',
  );
}

export async function saveFamilyPushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  contentEncoding?: string;
}): Promise<{ data: { id: number; subscribed: boolean } }> {
  return run(
    () =>
      familyFetch<{ data: { id: number; subscribed: boolean } }>(`/push/subscriptions`, {
        method: 'POST',
        body: subscription,
      }),
    'ثبت اعلان پوش ناموفق بود.',
  );
}

export async function deleteFamilyPushSubscription(endpoint: string): Promise<void> {
  await run(
    () => familyFetch(`/push/subscriptions`, { method: 'DELETE', body: { endpoint } }),
    'حذف اعلان پوش ناموفق بود.',
  );
}
