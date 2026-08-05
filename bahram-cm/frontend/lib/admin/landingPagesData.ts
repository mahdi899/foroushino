import 'server-only';
import { adminFetch } from '@/lib/auth/session';

export interface LandingPageFormFields {
  message: boolean;
  email: boolean;
}

export interface AdminLandingPage {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  hero_image: string | null;
  submit_label: string | null;
  success_message: string | null;
  form_fields: LandingPageFormFields;
  is_published: boolean;
  published_at: string | null;
  leads_count: number;
  created_at: string;
  updated_at: string;
}

export interface LandingPageSubmission {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  created_at: string;
}

export async function getLandingPages(): Promise<{ items: AdminLandingPage[]; error: string | null }> {
  try {
    const res = await adminFetch<{ data: AdminLandingPage[] }>('/landing-pages');
    return { items: res.data, error: null };
  } catch {
    return { items: [], error: 'دریافت فهرست لندینگ‌ها ناموفق بود.' };
  }
}

export async function getLandingPage(id: number): Promise<AdminLandingPage | null> {
  try {
    const res = await adminFetch<{ data: AdminLandingPage }>(`/landing-pages/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getLandingPageSubmissions(
  id: number,
  page = 1,
): Promise<{
  items: LandingPageSubmission[];
  landingPage: AdminLandingPage | null;
  meta: { current_page: number; last_page: number; total: number };
  error: string | null;
}> {
  try {
    const res = await adminFetch<{
      data: LandingPageSubmission[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
      landing_page: AdminLandingPage;
    }>(`/landing-pages/${id}/submissions`, { query: { page, per_page: 50 } });
    return { items: res.data, landingPage: res.landing_page, meta: res.meta, error: null };
  } catch {
    return {
      items: [],
      landingPage: null,
      meta: { current_page: 1, last_page: 1, total: 0 },
      error: 'دریافت فهرست ثبت‌نام‌ها ناموفق بود.',
    };
  }
}
