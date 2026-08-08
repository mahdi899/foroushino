'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { getComments, postComment } from '@/lib/family/api';
import {
  applyCommentRealtimeEvent,
  applyCommentRealtimeEventToList,
  type FamilyCommentChangedPayload,
  type FamilyCommentsPage,
} from '@/lib/family/commentRealtimeMerge';
import { useFamilyCommentsRealtime } from '@/lib/family/hooks/useFamilyCommentsRealtime';
import { patchCommentsCountInFeedCaches } from '@/lib/family/hooks/useFamilyRealtime';
import { usePageVisible } from '@/lib/family/hooks/usePageVisible';
import { setViewerFamilyId } from '@/lib/family/viewerFamilyId';
import { getFamilyRealtimeConnectionState, isRealtimeConfigured } from '@/lib/realtime/echo';
import type { FamilyComment } from '@/lib/family/types';

const FALLBACK_INITIAL_MS = 30_000;
const FALLBACK_STEADY_MS = 60_000;

function isWsHealthy(): boolean {
  if (!isRealtimeConfigured()) return false;
  const state = getFamilyRealtimeConnectionState();
  return state === 'connected' || state === 'connecting' || state === 'initialized';
}

export function useFamilyComments(postId: number, enabled: boolean) {
  const pageVisible = usePageVisible();
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ['family-comments', postId] : null,
    async () =>
      (await getComments(postId)) as FamilyCommentsPage,
    { revalidateOnFocus: false },
  );
  const [submitting, setSubmitting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [extraComments, setExtraComments] = useState<FamilyComment[]>([]);
  /** Cursor for the next older page. `undefined` = not paged yet (use SWR meta). */
  const [extraCursor, setExtraCursor] = useState<string | null | undefined>(undefined);
  /** Once a page returns `next_cursor: null`, stop — do not fall back to the first-page cursor. */
  const [olderExhausted, setOlderExhausted] = useState(false);
  const wasHealthyRef = useRef(true);
  const fallbackDelayRef = useRef(FALLBACK_INITIAL_MS);

  const familyId = data?.meta?.family_id ?? null;

  useEffect(() => {
    if (familyId != null) setViewerFamilyId(familyId);
  }, [familyId]);

  useEffect(() => {
    setExtraComments([]);
    setExtraCursor(undefined);
    setOlderExhausted(false);
  }, [postId]);

  const applyRealtime = useCallback(
    (payload: FamilyCommentChangedPayload) => {
      void mutate(
        (prev) => applyCommentRealtimeEvent(prev, payload),
        { revalidate: false },
      );
      setExtraComments((prev) => applyCommentRealtimeEventToList(prev, payload));
      // Same payload already carries the approved count — keep post cards in sync
      // even if the public feed ping is delayed or missed while the panel is open.
      if (typeof payload.approved_comments_count === 'number') {
        void patchCommentsCountInFeedCaches(payload.post_id, payload.approved_comments_count);
      }
    },
    [mutate],
  );

  useFamilyCommentsRealtime(postId, familyId, {
    enabled: enabled && Boolean(familyId),
    onEvent: applyRealtime,
  });

  // Safety-net sync only when WS is down and the panel is visible — never while healthy.
  useEffect(() => {
    if (!enabled || !pageVisible) return;

    let timer: number | null = null;
    let cancelled = false;

    const schedule = (delay: number) => {
      if (cancelled) return;
      timer = window.setTimeout(() => {
        void tick();
      }, delay);
    };

    const tick = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;

      const healthy = isWsHealthy();
      if (healthy) {
        if (!wasHealthyRef.current) {
          await mutate();
          setExtraComments([]);
          setExtraCursor(undefined);
          setOlderExhausted(false);
        }
        wasHealthyRef.current = true;
        fallbackDelayRef.current = FALLBACK_INITIAL_MS;
        schedule(FALLBACK_STEADY_MS);
        return;
      }

      wasHealthyRef.current = false;
      await mutate();
      setExtraComments([]);
      setExtraCursor(undefined);
      setOlderExhausted(false);
      const delay = fallbackDelayRef.current;
      fallbackDelayRef.current = FALLBACK_STEADY_MS;
      schedule(delay);
    };

    if (!isRealtimeConfigured() || !isWsHealthy()) {
      wasHealthyRef.current = false;
      fallbackDelayRef.current = FALLBACK_INITIAL_MS;
      schedule(FALLBACK_INITIAL_MS);
    } else {
      wasHealthyRef.current = true;
      fallbackDelayRef.current = FALLBACK_INITIAL_MS;
      schedule(FALLBACK_STEADY_MS);
    }

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [enabled, pageVisible, mutate, postId]);

  const submit = useCallback(
    async (body: string, parentId?: number | null) => {
      setSubmitting(true);
      try {
        const res = (await postComment(postId, body, parentId)) as { data: FamilyComment };
        const created = res.data;

        if (parentId) {
          const rootId = created.parent_id ?? parentId;
          const attach = (list: FamilyComment[]) =>
            list.map((c) =>
              c.id === rootId
                ? { ...c, replies: [...(c.replies ?? []), created] }
                : c,
            );

          await mutate((prev) =>
            prev
              ? { ...prev, data: attach(prev.data) }
              : { data: [], meta: { next_cursor: null } },
          );
          setExtraComments((prev) => attach(prev));
        } else {
          await mutate((prev) =>
            prev
              ? { ...prev, data: [created, ...prev.data] }
              : { data: [created], meta: { next_cursor: null } },
          );
        }

        return created;
      } finally {
        setSubmitting(false);
      }
    },
    [postId, mutate],
  );

  const loadMore = useCallback(async () => {
    if (olderExhausted || loadingMore) return false;
    const cursor = extraCursor !== undefined ? extraCursor : data?.meta.next_cursor ?? null;
    if (!cursor) return false;

    setLoadingMore(true);
    try {
      const res = (await getComments(postId, cursor)) as FamilyCommentsPage;
      setExtraComments((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        for (const c of data?.data ?? []) seen.add(c.id);
        const fresh = res.data.filter((c) => !seen.has(c.id));
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
      setExtraCursor(res.meta.next_cursor);
      if (res.meta.next_cursor == null) {
        setOlderExhausted(true);
      }
      return true;
    } finally {
      setLoadingMore(false);
    }
  }, [postId, data?.data, data?.meta.next_cursor, extraCursor, loadingMore, olderExhausted]);

  const comments = [...(data?.data ?? []), ...extraComments];
  // Never use `extraCursor ?? firstPageCursor` after exhaustion — `null ?? x` would
  // revive the sentinel forever and re-fetch the same older page.
  const hasMore =
    !olderExhausted &&
    Boolean(extraCursor !== undefined ? extraCursor : data?.meta.next_cursor);

  return {
    comments,
    isLoading,
    error: error instanceof Error ? error.message : error ? 'دریافت نظرات ناموفق بود.' : null,
    submitting,
    submit,
    loadMore,
    loadingMore,
    hasMore,
    familyId,
  };
}
