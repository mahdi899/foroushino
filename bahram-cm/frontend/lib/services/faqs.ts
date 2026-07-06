/** Dynamic FAQ service — content managed from the admin dashboard. */
import { getJson, type ApiResult } from "./api";

export type Faq = {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
};

type FaqsResponse = { data: Faq[] };

export async function getFaqs(category?: string): Promise<ApiResult<Faq[]>> {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const result = await getJson<FaqsResponse>(`/faqs${query}`);
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
