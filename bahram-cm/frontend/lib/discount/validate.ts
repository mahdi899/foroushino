import { apiErrorMessage } from "@/lib/api/errors";

export type DiscountPreview = {
  code: string;
  title: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  subtotal: number;
  coupon_discount: number;
  final_amount: number;
};

function publicApiBase(): string {
  const backend = (process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_PROXY_URL ?? "http://127.0.0.1:8010").replace(
    /\/+$/,
    "",
  );
  return `${backend}/api`;
}

export async function validateDiscountCode(input: {
  code: string;
  product_id: number;
  via_link?: boolean;
  customer_phone?: string;
  token?: string;
}): Promise<{ ok: true; data: DiscountPreview } | { ok: false; error: string }> {
  const res = await fetch(`${publicApiBase()}/discount-codes/validate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
    },
    body: JSON.stringify({
      code: input.code,
      product_id: input.product_id,
      via_link: input.via_link ?? false,
      customer_phone: input.customer_phone,
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: apiErrorMessage(json, "coupon", "کد تخفیف معتبر نیست."),
    };
  }

  return { ok: true, data: json.data as DiscountPreview };
}
