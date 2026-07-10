'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminFetch, getToken } from '@/lib/auth/session';
import { SERVER_API_URL } from '@/lib/api/config';
import { resolveProductSiteFeaturedImage } from '@/lib/catalog/productFeaturedImage';
import { revalidatePublicContent, revalidateTestimonialSurfaces } from '@/lib/cache/contentRevalidation';
import type { AdminFaq, AdminOrder, AdminProduct, AdminStudentTestimonial, PaymentSettingsData, AdminDiscountCode } from '@/lib/admin/commerceTypes';

export async function loadPaymentSettingsAction(): Promise<PaymentSettingsData | null> {
  try {
    const res = await adminFetch<{ data: PaymentSettingsData }>('/panel/payment-settings');
    return res.data;
  } catch {
    return null;
  }
}

function revalidateCommerce() {
  void revalidatePublicContent(() => {
    revalidatePath('/');
    revalidatePath('/courses');
    revalidatePath('/admin/commerce/products');
    revalidatePath('/admin/commerce/orders');
    revalidatePath('/admin/commerce/faqs');
    revalidatePath('/admin/commerce/testimonials');
    revalidatePath('/admin/commerce/payment-settings');
    revalidatePath('/admin/commerce/discount-codes');
    revalidatePath('/transformations');
    revalidateTag('public-faqs', 'max');
    revalidateTag('public-transformations', 'max');
    revalidateTag('faqs', 'max');
  });
}

export async function syncProductFeaturedImageFromSite(
  id: number,
): Promise<{ ok: boolean; featured_image?: string; error?: string }> {
  try {
    const res = await adminFetch<{ data: AdminProduct }>(`/products/${id}`);
    const product = res.data;
    if (product.featured_image?.trim()) {
      return { ok: true, featured_image: product.featured_image };
    }

    const featured_image = resolveProductSiteFeaturedImage({
      slug: product.slug,
      landing_href: product.landing_href,
    });

    await adminFetch(`/products/${id}`, {
      method: 'PATCH',
      body: { featured_image },
    });
    revalidateCommerce();
    return { ok: true, featured_image };
  } catch (e) {
    const err = e as Error & { payload?: { message?: string } };
    return { ok: false, error: err.payload?.message ?? 'همگام‌سازی تصویر شاخص ناموفق بود.' };
  }
}

export async function saveProduct(
  input: Partial<AdminProduct> & { title: string; price: number },
  id?: number,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    const body = {
      title: input.title,
      slug: input.slug,
      type: input.type ?? 'normal',
      description: input.description,
      short_description: input.short_description,
      price: input.price,
      sale_price: input.sale_price,
      referral_cashback_enabled: input.referral_cashback_enabled ?? false,
      referral_cashback_type: input.referral_cashback_enabled ? input.referral_cashback_type ?? null : null,
      referral_cashback_value: input.referral_cashback_enabled ? input.referral_cashback_value ?? null : null,
      is_active: input.is_active ?? true,
      featured_image: input.featured_image,
      show_on_courses: input.show_on_courses ?? false,
      featured_listing: input.featured_listing ?? false,
      course_level: input.course_level,
      course_duration: input.course_duration,
      landing_href: input.landing_href,
      spotplayer_course_id: input.spotplayer_course_id,
      spotplayer_product_id: null,
      meta_title: input.meta_title,
      meta_description: input.meta_description,
    };

    if (id) {
      await adminFetch(`/products/${id}`, { method: 'PATCH', body });
      revalidateCommerce();
      return { ok: true, id };
    }

    const res = await adminFetch<{ data: { id: number } }>('/products', { method: 'POST', body });
    revalidateCommerce();
    return { ok: true, id: res.data.id };
  } catch (e) {
    const err = e as Error & { payload?: { message?: string } };
    return { ok: false, error: err.payload?.message ?? 'ذخیره محصول ناموفق بود.' };
  }
}

export async function deleteProduct(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/products/${id}`, { method: 'DELETE' });
    revalidateCommerce();
    return { ok: true };
  } catch {
    return { ok: false, error: 'حذف محصول ناموفق بود.' };
  }
}

export async function updateOrder(
  id: number,
  data: { status?: string; payment_status?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/orders/${id}`, { method: 'PATCH', body: data });
    revalidateCommerce();
    return { ok: true };
  } catch {
    return { ok: false, error: 'به‌روزرسانی سفارش ناموفق بود.' };
  }
}

export async function resendOrderSms(id: number): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await adminFetch<{ ok: boolean; message: string }>(`/orders/${id}/resend-sms`, { method: 'POST' });
    return { ok: res.ok, message: res.message };
  } catch (e) {
    const err = e as Error & { payload?: { message?: string } };
    return { ok: false, error: err.payload?.message ?? 'ارسال پیامک ناموفق بود.' };
  }
}

export async function fulfillOrder(
  id: number,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await adminFetch<{ ok: boolean; message: string }>(`/orders/${id}/fulfill`, { method: 'POST' });
    revalidateCommerce();
    revalidatePath(`/admin/commerce/orders/${id}`);
    return { ok: res.ok, message: res.message };
  } catch (e) {
    const err = e as Error & { payload?: { message?: string } };
    return { ok: false, error: err.payload?.message ?? 'تحویل سفارش ناموفق بود.' };
  }
}

export async function exportOrdersCsv(filters?: {
  search?: string;
  status?: string;
  payment_status?: string;
  product_type?: string;
}): Promise<{ ok: true; csv: string } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const url = new URL(`${SERVER_API_URL}/panel/orders/export`);
    if (filters?.search) url.searchParams.set('search', filters.search);
    if (filters?.status) url.searchParams.set('status', filters.status);
    if (filters?.payment_status) url.searchParams.set('payment_status', filters.payment_status);
    if (filters?.product_type) url.searchParams.set('product_type', filters.product_type);

    const res = await fetch(url, {
      headers: {
        Accept: 'text/csv',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return { ok: false, error: 'خروجی گرفتن از سفارش‌ها ناموفق بود.' };
    }

    return { ok: true, csv: await res.text() };
  } catch {
    return { ok: false, error: 'خروجی گرفتن از سفارش‌ها ناموفق بود.' };
  }
}

export async function saveFaq(
  input: { question: string; answer: string; category?: string | null; sort_order?: number; is_active?: boolean },
  id?: number,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    if (id) {
      await adminFetch(`/faqs/${id}`, { method: 'PATCH', body: input });
      revalidateCommerce();
      return { ok: true, id };
    }
    const res = await adminFetch<{ data: { id: number } }>('/faqs', { method: 'POST', body: input });
    revalidateCommerce();
    return { ok: true, id: res.data.id };
  } catch {
    return { ok: false, error: 'ذخیره سوال ناموفق بود.' };
  }
}

export async function deleteFaq(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/faqs/${id}`, { method: 'DELETE' });
    revalidateCommerce();
    return { ok: true };
  } catch {
    return { ok: false, error: 'حذف سوال ناموفق بود.' };
  }
}

export async function saveStudentTestimonial(
  input: {
    slug: string;
    name: string;
    role?: string;
    before_text: string;
    after_text: string;
    summary: string;
    metric_label?: string | null;
    metric_value?: string | null;
    body: string;
    portrait_image?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    sort_order?: number;
    is_active?: boolean;
  },
  id?: number,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    if (id) {
      await adminFetch(`/student-testimonials/${id}`, { method: 'PATCH', body: input });
      revalidateCommerce();
      await revalidateTestimonialSurfaces(input.slug);
      return { ok: true, id };
    }
    const res = await adminFetch<{ data: { id: number } }>('/student-testimonials', { method: 'POST', body: input });
    revalidateCommerce();
    await revalidateTestimonialSurfaces(input.slug);
    return { ok: true, id: res.data.id };
  } catch (e) {
    const err = e as Error & { payload?: { message?: string } };
    return { ok: false, error: err.payload?.message ?? 'ذخیره نظر دانشجو ناموفق بود.' };
  }
}

export async function deleteStudentTestimonial(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/student-testimonials/${id}`, { method: 'DELETE' });
    revalidateCommerce();
    return { ok: true };
  } catch {
    return { ok: false, error: 'حذف نظر دانشجو ناموفق بود.' };
  }
}

export async function savePaymentSettings(
  data: Partial<PaymentSettingsData> & { zarinpal_merchant_id?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch('/panel/payment-settings', { method: 'PUT', body: data });
    revalidateCommerce();
    return { ok: true };
  } catch {
    return { ok: false, error: 'ذخیره تنظیمات پرداخت ناموفق بود.' };
  }
}

export async function saveDiscountCode(
  input: Omit<AdminDiscountCode, 'id' | 'uses_count' | 'created_at' | 'updated_at' | 'products' | 'users'>,
  id?: number,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    const body = {
      code: input.code,
      title: input.title,
      description: input.description,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      is_active: input.is_active,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      max_uses: input.max_uses,
      max_uses_per_user: input.max_uses_per_user,
      min_order_amount: input.min_order_amount,
      max_discount_amount: input.max_discount_amount,
      requires_link: input.requires_link,
      restriction: input.restriction,
      product_ids: input.product_ids,
      user_ids: input.user_ids,
    };

    if (id) {
      await adminFetch(`/discount-codes/${id}`, { method: 'PATCH', body });
      revalidateCommerce();
      return { ok: true, id };
    }

    const res = await adminFetch<{ data: { id: number } }>('/discount-codes', { method: 'POST', body });
    revalidateCommerce();
    return { ok: true, id: res.data.id };
  } catch (e) {
    const err = e as Error & { payload?: { message?: string; errors?: Record<string, string[]> } };
    const firstError = err.payload?.errors ? Object.values(err.payload.errors)[0]?.[0] : undefined;
    return { ok: false, error: firstError ?? err.payload?.message ?? 'ذخیره کد تخفیف ناموفق بود.' };
  }
}

export async function deleteDiscountCode(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/discount-codes/${id}`, { method: 'DELETE' });
    revalidateCommerce();
    return { ok: true };
  } catch (e) {
    const err = e as Error & { payload?: { message?: string } };
    return { ok: false, error: err.payload?.message ?? 'حذف کد تخفیف ناموفق بود.' };
  }
}
