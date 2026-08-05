/** Public landing pages built from the admin panel — lead-capture only. */
import { cache } from "react";
import { getStaticJson } from "./staticFetch";
import type { ApiResult } from "./api";

export type PublicLandingPage = {
  slug: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  hero_image: string | null;
  submit_label: string | null;
  success_message: string | null;
  form_fields: { message: boolean; email: boolean };
};

type SingleResponse<T> = { data: T };

export const getPublicLandingPage = cache(async (
  slug: string,
): Promise<ApiResult<PublicLandingPage>> => {
  const result = await getStaticJson<SingleResponse<PublicLandingPage>>(
    `/landing-pages/${encodeURIComponent(slug)}`,
    { ttlKey: 'services', tags: ['landing-pages', `landing-page:${slug}`] },
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
});
