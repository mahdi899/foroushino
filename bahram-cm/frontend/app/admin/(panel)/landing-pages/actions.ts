'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';
import type { AdminLandingPage, LandingPageFormFields } from '@/lib/admin/landingPagesData';

export interface SaveLandingPageInput {
  title: string;
  slug?: string | null;
  subtitle?: string | null;
  body?: string | null;
  hero_image?: string | null;
  submit_label?: string | null;
  success_message?: string | null;
  form_fields: LandingPageFormFields;
  is_published: boolean;
}

function revalidateLandingPages(slug?: string | null) {
  revalidatePath('/admin/landing-pages');
  revalidateTag('landing-pages', 'max');
  if (slug) {
    revalidatePath(`/l/${slug}`);
    revalidateTag(`landing-page:${slug}`, 'max');
  }
}

export async function saveLandingPage(
  input: SaveLandingPageInput,
  id?: number,
): Promise<{ ok: boolean; id?: number; slug?: string; error?: string }> {
  try {
    if (id) {
      const res = await adminFetch<{ data: AdminLandingPage }>(`/landing-pages/${id}`, {
        method: 'PATCH',
        body: input,
      });
      revalidateLandingPages(res.data.slug);
      return { ok: true, id, slug: res.data.slug };
    }

    const res = await adminFetch<{ data: AdminLandingPage }>('/landing-pages', {
      method: 'POST',
      body: input,
    });
    revalidateLandingPages(res.data.slug);
    return { ok: true, id: res.data.id, slug: res.data.slug };
  } catch (e) {
    const err = e as Error & {
      payload?: { message?: string; message_fa?: string; errors?: Record<string, string[]> };
    };
    const firstError = err.payload?.errors ? Object.values(err.payload.errors)[0]?.[0] : undefined;
    return {
      ok: false,
      error: firstError ?? err.payload?.message_fa ?? err.payload?.message ?? err.message ?? 'ذخیره لندینگ ناموفق بود.',
    };
  }
}

export async function deleteLandingPage(id: number, slug?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/landing-pages/${id}`, { method: 'DELETE' });
    revalidateLandingPages(slug);
    return { ok: true };
  } catch {
    return { ok: false, error: 'حذف لندینگ ناموفق بود.' };
  }
}
