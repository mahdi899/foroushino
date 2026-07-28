import 'server-only';

import { cache } from 'react';
import { type ApiResult } from './api';
import { getStaticJson } from './staticFetch';
import type { PublicSeminar } from './seminars.types';

export type {
  PublicSeminar,
  PublicSeminarGalleryItem,
  PublicSeminarSliderItem,
} from './seminars.types';

type SeminarResponse = { data: PublicSeminar };

/** Public seminar landing — ISR, no cookies/auth. Ownership hydrates client-side. */
export const getPublicSeminarBySlug = cache(async (
  slug: string,
): Promise<ApiResult<PublicSeminar>> => {
  const result = await getStaticJson<SeminarResponse>(
    `/seminars/${encodeURIComponent(slug)}`,
    { ttlKey: 'seminars', tags: ['seminars', 'pricing', `seminar:${slug}`] },
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
});
