/** Zarinpal payment initiation service (second step of the checkout flow). */
import { INVALID_PAYMENT_GATEWAY_URL_MESSAGE, isZarinpalGatewayUrl } from "@/lib/checkout/paymentGateway";
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

  const paymentUrl = result.data.data.payment_url;
  if (!isZarinpalGatewayUrl(paymentUrl)) {
    return { ok: false, error: INVALID_PAYMENT_GATEWAY_URL_MESSAGE };
  }

  return { ok: true, data: result.data.data };
}
