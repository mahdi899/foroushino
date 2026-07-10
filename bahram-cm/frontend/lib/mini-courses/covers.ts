import { courseCoverPhotos, sitePhotos } from '@/lib/site-photo-paths';

/** Canonical landscape site photos for mini courses until admin thumbnails are set. */
const MINI_COURSE_COVER_BY_SLUG: Record<string, string> = {
  'alfabe-kampain-nevisi': sitePhotos.manifestoLandscape,
  'senario-nevisi': sitePhotos.landscapeSession,
};

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

export function resolveMiniCourseCover(slug: string, index = 0, thumbnail?: string | null): string {
  if (thumbnail?.trim()) return thumbnail.trim();
  return (
    MINI_COURSE_COVER_BY_SLUG[slug] ??
    courseCoverPhotos[index % courseCoverPhotos.length] ??
    courseCoverPhotos[hashSlug(slug) % courseCoverPhotos.length]!
  );
}

export type MiniCourseCardTone = 'gold' | 'teal';

export function miniCourseCardTone(slug: string, index = 0): MiniCourseCardTone {
  const tones: MiniCourseCardTone[] = ['gold', 'teal'];
  if (slug.includes('kampain') || slug.includes('campaign')) return 'gold';
  if (slug.includes('senario') || slug.includes('scenario')) return 'teal';
  return tones[index % tones.length]!;
}
