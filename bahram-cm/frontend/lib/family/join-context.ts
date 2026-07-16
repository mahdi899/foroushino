'use client';

import { ReadonlyURLSearchParams } from 'next/navigation';

/** Build join attribution payload from URL params (UTM, reel, entry event). */
export function buildFamilyJoinContext(searchParams: ReadonlyURLSearchParams): Record<string, string | undefined> {
  const reel = searchParams.get('reel') ?? searchParams.get('entry_event_ref');
  const entryEvent = searchParams.get('entry_event') ?? searchParams.get('entry_event_id');

  return {
    source: searchParams.get('utm_source') ?? searchParams.get('src') ?? undefined,
    campaign: searchParams.get('utm_campaign') ?? undefined,
    content: searchParams.get('utm_content') ?? undefined,
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    entry_event: entryEvent ?? undefined,
    entry_event_ref: reel ?? undefined,
    reel: searchParams.get('reel') ?? undefined,
  };
}
