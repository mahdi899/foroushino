/** Zarinpal payment initiation service (second step of the checkout flow). */
import { postJson, type ApiResult } from "./api";

export type ZarinpalRequestResult = {
  payment_url: string;
  authority: string;
};

type ZarinpalResponse = { data: ZarinpalRequestResult };

export async function requestZarinpalPayment(
  orderId: number,
): Promise<ApiResult<ZarinpalRequestResult>> {
  const result = await postJson<ZarinpalResponse>("/payments/zarinpal/request", {
    order_id: orderId,
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
