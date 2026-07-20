'use client';

import { ReadonlyURLSearchParams } from 'next/navigation';

const STORAGE_KEY = 'bahram-family-join-context';

type JoinContext = Record<string, string | undefined>;

function extractFromParams(
  searchParams: ReadonlyURLSearchParams | URLSearchParams,
): JoinContext {
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
    family_id: searchParams.get('family_id') ?? searchParams.get('family') ?? undefined,
  };
}

function hasAttribution(ctx: JoinContext): boolean {
  return Object.values(ctx).some((value) => value !== undefined && value !== '');
}

function readStoredContext(): JoinContext {
  if (typeof window === 'undefined') return {};

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as JoinContext;
  } catch {
    return {};
  }
}

function mergeContexts(stored: JoinContext, fromUrl: JoinContext): JoinContext {
  const merged: JoinContext = { ...stored };

  for (const [key, value] of Object.entries(fromUrl)) {
    if (value !== undefined && value !== '') {
      merged[key] = value;
    }
  }

  return merged;
}

/** Persist URL attribution so login redirects do not drop entry link params. */
export function captureFamilyJoinContext(
  searchParams: ReadonlyURLSearchParams | URLSearchParams,
): void {
  if (typeof window === 'undefined') return;

  const merged = mergeContexts(readStoredContext(), extractFromParams(searchParams));
  if (hasAttribution(merged)) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
}

/** Login redirect target that keeps current query string on the active host. */
export { familyLoginRedirectPath } from '@/lib/domains';

/** Build join attribution payload from stored context + current URL (URL wins). */
export function buildFamilyJoinContext(searchParams: ReadonlyURLSearchParams): JoinContext {
  return mergeContexts(readStoredContext(), extractFromParams(searchParams));
}
