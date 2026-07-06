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
};

export type ProductDetail = ProductListItem & {
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

type ListResponse<T> = { data: T[] };
type SingleResponse<T> = { data: T };

export async function getProducts(): Promise<ApiResult<ProductListItem[]>> {
  const result = await getJson<ListResponse<ProductListItem>>("/products");
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
