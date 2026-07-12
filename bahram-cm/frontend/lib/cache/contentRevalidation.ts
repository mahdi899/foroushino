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
    revalidatePath('/admin/academy/mini-courses');
    revalidatePath('/courses');
    revalidatePath('/mini-courses');
    if (_slug) {
      revalidatePath(`/mini-courses/${_slug}`);
    }
  });
}

export async function revalidateFaqSurfaces(): Promise<void> {
  await revalidatePublicContent(() => {
    revalidateTag('faqs', 'max');
    revalidateTag('public-faqs', 'max');
    revalidatePath('/faq');
    revalidatePath('/admin/commerce/faqs');
  });
}
