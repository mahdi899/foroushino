import 'server-only';
import { adminFetch } from '@/lib/auth/session';
import type {
  AdminFaq,
  AdminOrder,
  AdminOrderDetail,
  AdminProduct,
  AdminStudentTestimonial,
  OrderAnalytics,
  PaymentSettingsData,
} from './commerceTypes';

export type {
  AdminFaq,
  AdminOrder,
  AdminOrderDetail,
  AdminProduct,
  AdminStudentTestimonial,
  PaymentSettingsData,
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

export async function getOrders(filters?: {
  search?: string;
  status?: string;
  payment_status?: string;
  product_type?: string;
  page?: number;
  per_page?: number;
}): Promise<{
  items: AdminOrder[];
  meta: { current_page: number; last_page: number; per_page: number; total: number } | null;
  error: string | null;
}> {
  try {
    const res = await adminFetch<{
      data: AdminOrder[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
    }>('/orders', {
      query: {
        per_page: filters?.per_page ?? 50,
        page: filters?.page,
        search: filters?.search,
        status: filters?.status,
        payment_status: filters?.payment_status,
        product_type: filters?.product_type,
      },
    });
    return { items: res.data, meta: res.meta, error: null };
  } catch (e) {
    return { items: [], meta: null, error: commerceErrorMessage(e) };
  }
}

export async function getOrder(id: number): Promise<AdminOrderDetail | null> {
  try {
    const res = await adminFetch<{ data: AdminOrderDetail }>(`/orders/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getOrderAnalytics(days: number | 'all' = 30): Promise<{
  data: OrderAnalytics | null;
  error: string | null;
}> {
  try {
    const res = await adminFetch<{ data: OrderAnalytics }>('/orders/analytics', {
      query: { days: days === 'all' ? 'all' : days },
    });
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: commerceErrorMessage(e) };
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

export async function getStudentTestimonials(): Promise<{ items: AdminStudentTestimonial[]; error: string | null }> {
  try {
    const res = await adminFetch<{ data: AdminStudentTestimonial[] }>('/student-testimonials', { query: { per_page: 200 } });
    return { items: res.data, error: null };
  } catch (e) {
    return { items: [], error: commerceErrorMessage(e) };
  }
}

export async function getStudentTestimonial(id: number): Promise<AdminStudentTestimonial | null> {
  try {
    const res = await adminFetch<{ data: AdminStudentTestimonial }>(`/student-testimonials/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getPaymentSettings(): Promise<PaymentSettingsData | null> {
  try {
    const res = await adminFetch<{ data: PaymentSettingsData }>('/panel/payment-settings');
    return res.data;
  } catch {
    return null;
  }
}
