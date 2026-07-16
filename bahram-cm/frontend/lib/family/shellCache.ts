import type {
  FamilyBranding,
  FamilyFeedMeta,
  FamilyFeedResponse,
  FamilyMeResponse,
} from '@/lib/family/types';

const STORAGE_KEY = 'bahram-family-shell-v1';
const SCHEMA_VERSION = 1 as const;

export type FamilyShellSnapshot = {
  schemaVersion: typeof SCHEMA_VERSION;
  savedAt: number;
  branding: FamilyBranding;
  memberCount?: number;
};

function isBranding(value: unknown): value is FamilyBranding {
  if (!value || typeof value !== 'object') return false;
  const row = value as FamilyBranding;
  return typeof row.display_name === 'string' && typeof row.profile_name === 'string';
}

export function readFamilyShellSnapshot(): FamilyShellSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as FamilyShellSnapshot;
    if (parsed?.schemaVersion !== SCHEMA_VERSION || !isBranding(parsed.branding)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeFamilyShellSnapshot(partial: {
  branding?: FamilyBranding;
  memberCount?: number;
}): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = readFamilyShellSnapshot();
    const branding = partial.branding ?? existing?.branding;
    if (!branding) return;

    const snapshot: FamilyShellSnapshot = {
      schemaVersion: SCHEMA_VERSION,
      savedAt: Date.now(),
      branding,
      memberCount:
        typeof partial.memberCount === 'number'
          ? partial.memberCount
          : existing?.memberCount,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function shellBrandingFromFeedMeta(meta: FamilyFeedMeta): FamilyBranding | null {
  if (!meta.branding) return null;

  return {
    ...meta.branding,
    has_active_stories: meta.has_active_stories ?? meta.branding.has_active_stories,
    latest_story_id: meta.branding.latest_story_id ?? null,
  };
}

/** Feed meta can be stale (IndexedDB). Keep fresher avatar URLs from `/branding`. */
export function mergeFeedBrandingIntoCurrent(
  current: FamilyBranding | undefined,
  fromFeed: FamilyBranding,
): FamilyBranding {
  const currentVersion = current?.branding_version ?? 0;
  const feedVersion = fromFeed.branding_version ?? 0;
  const feedIsNewer = feedVersion > currentVersion;

  return {
    ...(current ?? fromFeed),
    display_name: fromFeed.display_name,
    profile_name: fromFeed.profile_name,
    has_active_stories: fromFeed.has_active_stories ?? current?.has_active_stories,
    latest_story_id: fromFeed.latest_story_id ?? current?.latest_story_id ?? null,
    branding_version: feedIsNewer ? fromFeed.branding_version : current?.branding_version ?? fromFeed.branding_version,
    profile_avatar: feedIsNewer
      ? fromFeed.profile_avatar
      : (current?.profile_avatar ?? fromFeed.profile_avatar),
    community_avatar: feedIsNewer
      ? fromFeed.community_avatar
      : (current?.community_avatar ?? fromFeed.community_avatar),
  };
}

/** SSR boot branding — merges story flags from `/me` and feed meta into one snapshot. */
export function brandingFromMeAndFeed(
  me: FamilyMeResponse,
  feed: FamilyFeedResponse | null,
): FamilyBranding | undefined {
  const fromFeed = feed?.meta ? shellBrandingFromFeedMeta(feed.meta) : null;
  const base = me.branding ?? fromFeed;
  if (!base) return undefined;

  return {
    ...base,
    has_active_stories:
      me.has_active_stories ?? feed?.meta.has_active_stories ?? base.has_active_stories,
    latest_story_id: base.latest_story_id ?? null,
  };
}

export function syncFamilyShellFromFeedMeta(meta: FamilyFeedMeta): void {
  const fromFeed = shellBrandingFromFeedMeta(meta);
  if (!fromFeed) return;

  const existing = readFamilyShellSnapshot()?.branding;
  const branding = mergeFeedBrandingIntoCurrent(existing, fromFeed);

  writeFamilyShellSnapshot({
    branding,
    memberCount: typeof meta.member_count === 'number' ? meta.member_count : undefined,
  });
}
