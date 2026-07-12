/** Dynamic FAQ service — content managed from the admin dashboard. */
import { getJson, type ApiResult } from "./api";
import { getStaticJson } from "./staticFetch";

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
  const result = await getStaticJson<FaqsResponse>(`/faqs${query}`, {
    ttlKey: "settings",
    tags: ["faqs", "public-faqs"],
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}

/** Client-side fetch (chatbot widgets, etc.). */
export async function getFaqsClient(category?: string): Promise<ApiResult<Faq[]>> {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const result = await getJson<FaqsResponse>(`/faqs${query}`);
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
