/** Public transformations / student testimonials from Laravel API. */
import { getJson, type ApiResult } from './api';
import type { PaginationMeta } from './articles';
import { getStaticJson } from './staticFetch';

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

const isServer = typeof window === 'undefined';

export async function getTransformationsFromApi(): Promise<ApiResult<TransformationApiRecord[]>> {
  const path = '/transformations?per_page=100';

  if (isServer) {
    const result = await getStaticJson<TransformationsResponse>(path, {
      ttlKey: 'cases',
      tags: ['testimonials', 'public-transformations'],
    });
    if (!result.ok) return result;
    return { ok: true, data: result.data.data ?? [] };
  }

  const result = await getJson<TransformationsResponse>(path);
  if (!result.ok) return result;
  return { ok: true, data: result.data.data ?? [] };
}

export async function getTransformationsPageFromApi(
  page = 1,
  perPage = 9,
): Promise<ApiResult<{ items: TransformationApiRecord[]; meta: PaginationMeta }>> {
  const path = `/transformations?page=${page}&per_page=${perPage}`;

  if (isServer) {
    const result = await getStaticJson<TransformationsResponse>(path, {
      ttlKey: 'cases',
      tags: ['testimonials', 'public-transformations'],
    });
    if (!result.ok) return result;
    const meta = result.data.meta;
    if (!meta) {
      const items = result.data.data ?? [];
      return {
        ok: true,
        data: {
          items,
          meta: { current_page: 1, last_page: 1, per_page: perPage, total: items.length },
        },
      };
    }
    return { ok: true, data: { items: result.data.data ?? [], meta } };
  }

  const result = await getJson<TransformationsResponse>(path);
  if (!result.ok) return result;
  const meta = result.data.meta;
  if (!meta) {
    const items = result.data.data ?? [];
    return {
      ok: true,
      data: {
        items,
        meta: { current_page: 1, last_page: 1, per_page: perPage, total: items.length },
      },
    };
  }
  return { ok: true, data: { items: result.data.data ?? [], meta } };
}

export async function getTransformationBySlugFromApi(
  slug: string,
): Promise<ApiResult<TransformationApiRecord | null>> {
  const path = `/transformations/${encodeURIComponent(slug)}`;

  if (isServer) {
    const result = await getStaticJson<TransformationResponse>(path, {
      ttlKey: 'cases',
      tags: ['testimonials', 'public-transformations', `testimonial:${slug}`],
    });
    if (!result.ok) {
      if (result.status === 404) return { ok: true, data: null };
      return result;
    }
    return { ok: true, data: result.data.data ?? null };
  }

  const result = await getJson<TransformationResponse>(path);
  if (!result.ok) {
    if (result.status === 404) return { ok: true, data: null };
    return result;
  }
  return { ok: true, data: result.data.data ?? null };
}
