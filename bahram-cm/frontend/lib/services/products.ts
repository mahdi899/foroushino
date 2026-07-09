/** Purchasable products/packages service (used by the checkout flow). */
import { getJson, type ApiResult } from "./api";

export type ProductListItem = {
  id: number;
  title: string;
  slug: string;
  type: "normal" | "package" | string;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  effective_price: number;
  featured_image: string | null;
  featured_image_alt?: string | null;
  show_on_courses?: boolean;
  featured_listing?: boolean;
  course_level?: string | null;
  course_duration?: string | null;
  landing_href?: string | null;
};

export type ProductDetail = ProductListItem & {
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  seminar?: {
    capacity: number | null;
    attendees_count: number;
    remaining_seats: number | null;
    is_full: boolean;
    date: string | null;
    location: string | null;
  } | null;
};

type ListResponse<T> = { data: T[] };
type SingleResponse<T> = { data: T };

export async function getProducts(options?: { listed?: boolean }): Promise<ApiResult<ProductListItem[]>> {
  const query = options?.listed ? '?listed=1' : '';
  const result = await getJson<ListResponse<ProductListItem>>(`/products${query}`);
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}

export async function getProductBySlug(
  slug: string,
): Promise<ApiResult<ProductDetail>> {
  const result = await getJson<SingleResponse<ProductDetail>>(
    `/products/${encodeURIComponent(slug)}`,
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
