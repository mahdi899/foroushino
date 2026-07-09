import { getJson, type ApiResult } from './api';

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
};

type SeminarResponse = { data: PublicSeminar };

export async function getPublicSeminarBySlug(slug: string): Promise<ApiResult<PublicSeminar>> {
  const result = await getJson<SeminarResponse>(`/seminars/${encodeURIComponent(slug)}`);
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
