import { apiErrorMessage } from "@/lib/api/errors";
import { checkoutPublicApiBase } from "@/lib/api/checkoutPublicApi";

export type DiscountPreview = {
  code: string;
  title: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  subtotal: number;
  coupon_discount: number;
  final_amount: number;
};

export async function validateDiscountCode(input: {
  code: string;
  product_id: number;
  via_link?: boolean;
  customer_phone?: string;
  token?: string;
}): Promise<{ ok: true; data: DiscountPreview } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${checkoutPublicApiBase()}/discount-codes/validate`, {
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
      signal: AbortSignal.timeout(15_000),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: apiErrorMessage(json, "coupon", "کد تخفیف معتبر نیست."),
      };
    }

    return { ok: true, data: json.data as DiscountPreview };
  } catch {
    return { ok: false, error: "بررسی کد تخفیف انجام نشد. دوباره تلاش کنید." };
  }
}
