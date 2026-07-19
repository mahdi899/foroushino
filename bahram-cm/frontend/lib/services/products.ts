/** Purchasable products/packages service (used by the checkout flow). */
import { cache } from "react";
import { getJson, type ApiResult } from "./api";
import { getStaticJson } from "./staticFetch";
import { getStudentToken } from "@/lib/student/session";

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
  already_purchased?: boolean;
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
  const result = options?.listed
    ? await getStaticJson<ListResponse<ProductListItem>>(`/products${query}`, {
        ttlKey: 'pricing',
        tags: ['products', 'pricing', 'home'],
      })
    : await getJson<ListResponse<ProductListItem>>(`/products${query}`);
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}

export const getProductBySlug = cache(async (
  slug: string,
): Promise<ApiResult<ProductDetail>> => {
  const token = await getStudentToken().catch(() => undefined);
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const path = `/products/${encodeURIComponent(slug)}`;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
  const url = `${base}/api${path}`;

  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: payload?.error?.message_fa ?? "درخواست انجام نشد. لطفاً دوباره تلاش کن.",
        code: payload?.error?.code,
        status: res.status,
      };
    }
    const json = (await res.json()) as SingleResponse<ProductDetail>;
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, error: "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کن." };
  }
});
