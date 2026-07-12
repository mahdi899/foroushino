'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';

let autoPurgeCache: { at: number; enabled: boolean } | null = null;
const AUTO_PURGE_TTL_MS = 30_000;

async function isAutoPurgeOnSaveEnabled(): Promise<boolean> {
  if (autoPurgeCache && Date.now() - autoPurgeCache.at < AUTO_PURGE_TTL_MS) {
    return autoPurgeCache.enabled;
  }

  try {
    const res = await adminFetch<{ data: Record<string, unknown> }>('/panel/cache/settings');
    const raw = res.data?.auto_purge_on_save;
    const enabled = raw === true || raw === '1' || raw === 1;
    autoPurgeCache = { at: Date.now(), enabled };
    return enabled;
  } catch {
    return true;
  }
}

/** Run ISR revalidation after admin content saves when auto_purge_on_save is enabled. */
export async function revalidatePublicContent(
  fn: () => void,
  options?: { force?: boolean },
): Promise<void> {
  if (!options?.force && !(await isAutoPurgeOnSaveEnabled())) return;
  fn();
}

export async function revalidateArticleSurfaces(slug?: string | null): Promise<void> {
  await revalidatePublicContent(() => {
    revalidateTag('articles', 'max');
    revalidateTag('seo', 'max');
    revalidatePath('/admin/blog');
    revalidatePath('/admin/blog/new');
    revalidatePath('/insights');
    revalidatePath('/sitemap.xml');
    revalidatePath('/sitemaps');
    if (slug) {
      revalidatePath(`/insights/${slug}`);
    }
  });
}

export async function revalidateTestimonialSurfaces(_slug?: string | null): Promise<void> {
  await revalidatePublicContent(() => {
    revalidateTag('testimonials', 'max');
    revalidateTag('public-transformations', 'max');
    revalidatePath('/admin/commerce/testimonials');
    revalidatePath('/transformations');
  });
}

export async function revalidateMiniCourseSurfaces(_slug?: string | null): Promise<void> {
  await revalidatePublicContent(() => {
    revalidateTag('mini-courses', 'max');
    revalidateTag('public-mini-courses', 'max');
    revalidateTag('content-comments', 'max');
    revalidatePath('/admin/academy/mini-courses');
    revalidatePath('/admin/content/comments');
    revalidatePath('/courses');
    revalidatePath('/mini-courses');
    if (_slug) {
      revalidatePath(`/mini-courses/${_slug}`);
    }
  });
}

export async function revalidateContentCommentSurfaces(
  type: string,
  slug?: string | null,
): Promise<void> {
  await revalidatePublicContent(() => {
    revalidateTag('content-comments', 'max');
    revalidatePath('/admin/content/comments');

    if (type === 'course') {
      revalidatePath('/courses');
      if (slug) revalidatePath(`/courses/${slug}`);
    } else if (type === 'mini_course') {
      revalidateTag('mini-courses', 'max');
      revalidatePath('/mini-courses');
      if (slug) revalidatePath(`/mini-courses/${slug}`);
    } else if (type === 'article') {
      revalidateTag('articles', 'max');
      revalidatePath('/insights');
      if (slug) revalidatePath(`/insights/${slug}`);
    } else if (type === 'seminar') {
      revalidatePath('/seminars');
      if (slug) revalidatePath(`/seminars/${slug}`);
    } else if (type === 'campaign_writing') {
      revalidatePath('/course/campaign-writing');
    }
  });
}
