/** Order creation service (first step of the checkout flow). */
import { postJson, type ApiResult } from "./api";

export type CreateOrderInput = {
  product_id: number;
  customer_name?: string;
  customer_phone: string;
  customer_email?: string;
  customer_national_code?: string;
  customer_extra_data?: Record<string, string>;
  /** Referral code captured from `?ref=` on the purchase link (Customer Club). */
  ref?: string;
};

export type OrderResult = {
  id: number;
  order_number: string;
  amount: number;
  discount_amount: number;
  final_amount: number;
  status: string;
  payment_status: string;
};

type OrderResponse = { data: OrderResult };

export async function createOrder(
  input: CreateOrderInput,
): Promise<ApiResult<OrderResult>> {
  const result = await postJson<OrderResponse>("/orders", input);
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
