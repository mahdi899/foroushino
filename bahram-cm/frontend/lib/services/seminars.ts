import { type ApiResult } from './api';
import { getStudentToken } from '@/lib/student/session';

export type PublicSeminar = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  date: string | null;
  location: string | null;
  price: number | null;
  sale_price: number | null;
  effective_price: number | null;
  capacity: number | null;
  attendees_count: number;
  remaining_seats: number | null;
  is_full: boolean;
  product_slug: string | null;
  is_purchasable: boolean;
  already_purchased?: boolean;
};

type SeminarResponse = { data: PublicSeminar };

export async function getPublicSeminarBySlug(slug: string): Promise<ApiResult<PublicSeminar>> {
  const token = await getStudentToken().catch(() => undefined);
  const headers: HeadersInit = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:3000';
  const url = `${base}/api/seminars/${encodeURIComponent(slug)}`;

  try {
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: payload?.error?.message_fa ?? 'درخواست انجام نشد. لطفاً دوباره تلاش کن.',
        code: payload?.error?.code,
        status: res.status,
      };
    }
    const json = (await res.json()) as SeminarResponse;
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, error: 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کن.' };
  }
}
