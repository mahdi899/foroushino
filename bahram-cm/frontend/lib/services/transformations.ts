/** Public transformations / student testimonials from Laravel API. */
import { getJson, type ApiResult } from './api';
import type { PaginationMeta } from './articles';

export type TransformationApiRecord = {
  slug: string;
  name: string;
  role: string;
  before: string;
  after: string;
  summary: string;
  metricLabel?: string | null;
  metricValue?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  portrait_image?: string | null;
  body: string;
};

type TransformationsResponse = { data: TransformationApiRecord[]; meta?: PaginationMeta };
type TransformationResponse = { data: TransformationApiRecord };

export async function getTransformationsFromApi(): Promise<ApiResult<TransformationApiRecord[]>> {
  const result = await getJson<TransformationsResponse>('/transformations?per_page=100');
  if (!result.ok) return result;
  return { ok: true, data: result.data.data ?? [] };
}

export async function getTransformationsPageFromApi(
  page = 1,
  perPage = 9,
): Promise<ApiResult<{ items: TransformationApiRecord[]; meta: PaginationMeta }>> {
  const result = await getJson<TransformationsResponse>(
    `/transformations?page=${page}&per_page=${perPage}`,
  );
  if (!result.ok) return result;
  const meta = result.data.meta;
  if (!meta) {
    const items = result.data.data ?? [];
    return {
      ok: true,
      data: {
        items,
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: perPage,
          total: items.length,
        },
      },
    };
  }
  return { ok: true, data: { items: result.data.data ?? [], meta } };
}

export async function getTransformationBySlugFromApi(
  slug: string,
): Promise<ApiResult<TransformationApiRecord | null>> {
  const result = await getJson<TransformationResponse>(`/transformations/${encodeURIComponent(slug)}`);
  if (!result.ok) {
    if (result.status === 404) return { ok: true, data: null };
    return result;
  }
  return { ok: true, data: result.data.data ?? null };
}
