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
  reference_pricing?: {
    amount: number;
    final_amount: number;
    seminar_discount: number;
    seminar_off: boolean;
    seminar_title?: string | null;
  } | null;
  seminar?: {
    capacity: number | null;
    attendees_count: number;
    remaining_seats: number | null;
    is_full: boolean;
    is_ended?: boolean;
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

/**
 * Public marketing pages — ISR, no cookies/auth.
 * Prefer this over getProductBySlug so soft navigations (_rsc) hit the route cache.
 */
export const getPublicProductBySlug = cache(async (
  slug: string,
): Promise<ApiResult<ProductDetail>> => {
  const result = await getStaticJson<SingleResponse<ProductDetail>>(
    `/products/${encodeURIComponent(slug)}`,
    { ttlKey: 'pricing', tags: ['products', 'pricing'] },
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
});

/** Personalized product detail (ownership / seminar quote). Uses no-store + optional Bearer. */
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

/** Guest pricing / ownership seed for ProductPurchaseProvider. */
export function productPurchaseInitial(product: ProductDetail) {
  const pricing = product.reference_pricing;
  const listPrice = pricing?.amount ?? product.price;
  const finalPrice = pricing?.final_amount ?? product.effective_price;
  const hasDiscount = finalPrice < listPrice;
  const discountPercent = hasDiscount
    ? Math.round(((listPrice - finalPrice) / listPrice) * 100)
    : null;

  return {
    alreadyPurchased: product.already_purchased ?? false,
    listPrice,
    finalPrice,
    hasDiscount,
    discountPercent,
    seminarOff: Boolean(pricing?.seminar_off),
    seminarTitle: pricing?.seminar_title ?? null,
  };
}
