'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { getComments, postComment } from '@/lib/family/api';
import type { FamilyComment } from '@/lib/family/types';

export function useFamilyComments(postId: number, enabled: boolean) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ['family-comments', postId] : null,
    async () => (await getComments(postId)) as { data: FamilyComment[]; meta: { next_cursor: string | null } },
    { revalidateOnFocus: false },
  );
  const [submitting, setSubmitting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [extraComments, setExtraComments] = useState<FamilyComment[]>([]);
  const [extraCursor, setExtraCursor] = useState<string | null>(null);

  useEffect(() => {
    setExtraComments([]);
    setExtraCursor(null);
  }, [postId]);

  const submit = useCallback(
    async (body: string) => {
      setSubmitting(true);
      try {
        const res = (await postComment(postId, body)) as { data: FamilyComment };
        await mutate((prev) =>
          prev ? { ...prev, data: [res.data, ...prev.data] } : { data: [res.data], meta: { next_cursor: null } },
        );
        return res.data;
      } finally {
        setSubmitting(false);
      }
    },
    [postId, mutate],
  );

  const loadMore = useCallback(async () => {
    const cursor = extraCursor ?? data?.meta.next_cursor;
    if (!cursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const res = (await getComments(postId, cursor)) as {
        data: FamilyComment[];
        meta: { next_cursor: string | null };
      };
      setExtraComments((prev) => [...prev, ...res.data]);
      setExtraCursor(res.meta.next_cursor);
    } finally {
      setLoadingMore(false);
    }
  }, [postId, data?.meta.next_cursor, extraCursor, loadingMore]);

  const comments = [...(data?.data ?? []), ...extraComments];
  const hasMore = Boolean(extraCursor ?? data?.meta.next_cursor);

  return {
    comments,
    isLoading,
    error: error instanceof Error ? error.message : error ? 'دریافت نظرات ناموفق بود.' : null,
    submitting,
    submit,
    loadMore,
    loadingMore,
    hasMore,
  };
}
