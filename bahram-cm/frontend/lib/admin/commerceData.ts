import 'server-only';
import { adminFetch } from '@/lib/auth/session';
import type {
  AdminFaq,
  AdminOrder,
  AdminProduct,
  PaymentSettingsData,
  SmsSpotplayerSettingsData,
} from './commerceTypes';

export type {
  AdminFaq,
  AdminOrder,
  AdminProduct,
  PaymentSettingsData,
  SmsSpotplayerSettingsData,
} from './commerceTypes';

export { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, formatToman } from './commerceTypes';

function commerceErrorMessage(error: unknown): string {
  const err = error as Error & { status?: number };
  if (err.status === 401) {
    return 'نشست شما منقضی شده. از پنل خارج شوید و دوباره وارد شوید.';
  }
  return 'اتصال به API برقرار نشد. مطمئن شوید سرور لاراول روی پورت ۸۰۱۰ در حال اجراست.';
}

export async function getProducts(): Promise<{ items: AdminProduct[]; error: string | null }> {
  try {
    const res = await adminFetch<{ data: AdminProduct[] }>('/products', { query: { per_page: 200 } });
    return { items: res.data, error: null };
  } catch (e) {
    return { items: [], error: commerceErrorMessage(e) };
  }
}

export async function getProduct(id: number): Promise<AdminProduct | null> {
  try {
    const res = await adminFetch<{ data: AdminProduct }>(`/products/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getOrders(): Promise<{ items: AdminOrder[]; error: string | null }> {
  try {
    const res = await adminFetch<{ data: AdminOrder[] }>('/orders', { query: { per_page: 200 } });
    return { items: res.data, error: null };
  } catch (e) {
    return { items: [], error: commerceErrorMessage(e) };
  }
}

export async function getOrder(id: number): Promise<AdminOrder | null> {
  try {
    const res = await adminFetch<{ data: AdminOrder }>(`/orders/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getFaqs(): Promise<{ items: AdminFaq[]; error: string | null }> {
  try {
    const res = await adminFetch<{ data: AdminFaq[] }>('/faqs', { query: { per_page: 200 } });
    return { items: res.data, error: null };
  } catch (e) {
    return { items: [], error: commerceErrorMessage(e) };
  }
}

export async function getFaq(id: number): Promise<AdminFaq | null> {
  try {
    const res = await adminFetch<{ data: AdminFaq }>(`/faqs/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getPaymentSettings(): Promise<PaymentSettingsData | null> {
  try {
    const res = await adminFetch<{ data: PaymentSettingsData }>('/manage/payment-settings');
    return res.data;
  } catch {
    return null;
  }
}

export async function getSmsSpotplayerSettings(): Promise<SmsSpotplayerSettingsData | null> {
  try {
    const res = await adminFetch<{ data: SmsSpotplayerSettingsData }>('/manage/sms-spotplayer-settings');
    return res.data;
  } catch {
    return null;
  }
}
