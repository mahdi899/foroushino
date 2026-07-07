'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';
import { revalidatePublicContent, revalidateTestimonialSurfaces } from '@/lib/cache/contentRevalidation';
import type { AdminFaq, AdminOrder, AdminProduct, AdminStudentTestimonial, PaymentSettingsData, SmsSpotplayerSettingsData } from '@/lib/admin/commerceTypes';

export async function loadPaymentSettingsAction(): Promise<PaymentSettingsData | null> {
  try {
    const res = await adminFetch<{ data: PaymentSettingsData }>('/panel/payment-settings');
    return res.data;
  } catch {
    return null;
  }
}

export async function loadSmsSpotplayerSettingsAction(): Promise<SmsSpotplayerSettingsData | null> {
  try {
    const res = await adminFetch<{ data: SmsSpotplayerSettingsData }>('/panel/sms-spotplayer-settings');
    return res.data;
  } catch {
    return null;
  }
}

function revalidateCommerce() {
  void revalidatePublicContent(() => {
    revalidatePath('/admin/commerce/products');
    revalidatePath('/admin/commerce/orders');
    revalidatePath('/admin/commerce/faqs');
    revalidatePath('/admin/commerce/testimonials');
    revalidatePath('/admin/commerce/payment-settings');
    revalidatePath('/admin/commerce/sms-spotplayer-settings');
    revalidatePath('/transformations');
    revalidateTag('public-faqs', 'max');
    revalidateTag('public-transformations', 'max');
    revalidateTag('faqs', 'max');
  });
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
      is_active: input.is_active ?? true,
      featured_image: input.featured_image,
      spotplayer_course_id: input.spotplayer_course_id,
      spotplayer_product_id: input.spotplayer_product_id,
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

export async function saveSmsSpotplayerSettings(
  data: Partial<SmsSpotplayerSettingsData> & { sms_api_key?: string; spotplayer_api_key?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch('/panel/sms-spotplayer-settings', { method: 'PUT', body: data });
    revalidateCommerce();
    return { ok: true };
  } catch {
    return { ok: false, error: 'ذخیره تنظیمات ناموفق بود.' };
  }
}

export async function testSmsSettings(): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await adminFetch<{ ok: boolean; message: string }>('/panel/sms-spotplayer-settings/test-sms', {
      method: 'POST',
    });
    return { ok: res.ok, message: res.message };
  } catch (e) {
    const err = e as Error & { payload?: { message?: string } };
    return { ok: false, error: err.payload?.message ?? 'تست پیامک ناموفق بود.' };
  }
}

export async function testSpotplayerSettings(): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await adminFetch<{ ok: boolean; message: string }>(
      '/panel/sms-spotplayer-settings/test-spotplayer',
      { method: 'POST' },
    );
    return { ok: res.ok, message: res.message };
  } catch (e) {
    const err = e as Error & { payload?: { message?: string } };
    return { ok: false, error: err.payload?.message ?? 'تست SpotPlayer ناموفق بود.' };
  }
}
