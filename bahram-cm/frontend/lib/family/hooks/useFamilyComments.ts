'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { getComments, postComment } from '@/lib/family/api';
import type { FamilyComment } from '@/lib/family/types';

export function useFamilyComments(postId: number, enabled: boolean) {
  const { data, isLoading, mutate } = useSWR(
    enabled ? ['family-comments', postId] : null,
    async () => (await getComments(postId)) as { data: FamilyComment[]; meta: { next_cursor: string | null } },
    { revalidateOnFocus: false },
  );
  const [submitting, setSubmitting] = useState(false);

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

  return {
    comments: data?.data ?? [],
    isLoading,
    submitting,
    submit,
  };
}
