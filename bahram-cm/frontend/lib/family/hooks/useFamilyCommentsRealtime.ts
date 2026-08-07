'use client';

import { useEffect, useRef } from 'react';
import { isRealtimeConfigured } from '@/lib/realtime/config';
import type { FamilyEcho } from '@/lib/realtime/echo';
import type { FamilyCommentChangedPayload } from '@/lib/family/commentRealtimeMerge';

type Options = {
  enabled?: boolean;
  onEvent?: (payload: FamilyCommentChangedPayload) => void;
};

const channelRefCounts = new Map<string, number>();

function channelName(familyId: number, postId: number): string {
  return `family.${familyId}.post.${postId}.comments`;
}

/**
 * Subscribe to the private post comments channel while the comments panel is open.
 * Reuses the shared Echo singleton — does not open a new WebSocket connection.
 */
export function useFamilyCommentsRealtime(
  postId: number,
  familyId: number | null | undefined,
  { enabled = true, onEvent }: Options = {},
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !familyId || !postId || !isRealtimeConfigured()) return;

    let cancelled = false;
    let echo: FamilyEcho | null = null;
    let channel: ReturnType<FamilyEcho['private']> | null = null;
    const name = channelName(familyId, postId);

    const handler = (payload: FamilyCommentChangedPayload) => {
      if (!payload || payload.post_id !== postId) return;
      if (payload.family_id != null && payload.family_id !== familyId) return;
      onEventRef.current?.(payload);
    };

    const connect = async () => {
      const { getEcho } = await import('@/lib/realtime/echo');
      if (cancelled) return;
      echo = getEcho();
      if (!echo) return;

      channel = echo.private(name);
      channelRefCounts.set(name, (channelRefCounts.get(name) ?? 0) + 1);
      channel.listen('.family.comment.changed', handler);
    };

    void connect();

    return () => {
      cancelled = true;
      if (!channel || !echo) return;
      channel.stopListening('.family.comment.changed', handler);
      const next = Math.max(0, (channelRefCounts.get(name) ?? 1) - 1);
      if (next === 0) {
        channelRefCounts.delete(name);
        echo.leave(name);
      } else {
        channelRefCounts.set(name, next);
      }
    };
  }, [enabled, familyId, postId]);
}
