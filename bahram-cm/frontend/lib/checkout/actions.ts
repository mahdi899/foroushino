'use server';

import { buildCustomerName } from '@/lib/checkout/productFields';
import { INVALID_PAYMENT_GATEWAY_URL_MESSAGE, isCheckoutRedirectUrl } from '@/lib/checkout/paymentGateway';
import { getCurrentStudent, getStudentToken } from '@/lib/student/session';

type CheckoutResult =
  | { ok: true; payment_url: string; order_number: string }
  | { ok: false; error: string };

function publicApiBase(): string {
  const backend = (process.env.BACKEND_PROXY_URL ?? 'http://127.0.0.1:8010').replace(/\/+$/, '');
  return `${backend}/api`;
}

async function requestPayment(orderId: number, token?: string): Promise<CheckoutResult> {
  const res = await fetch(`${publicApiBase()}/payments/zarinpal/request`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ order_id: orderId }),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message_fa ?? 'شروع پرداخت ناموفق بود.' };
  }

  const paymentUrl = json?.data?.payment_url;
  if (typeof paymentUrl !== 'string' || !isCheckoutRedirectUrl(paymentUrl)) {
    return { ok: false, error: INVALID_PAYMENT_GATEWAY_URL_MESSAGE };
  }

  return {
    ok: true,
    payment_url: paymentUrl,
    order_number: (json.data?.order_number as string) ?? '',
  };
}

async function createOrder(
  body: Record<string, unknown>,
  token?: string,
): Promise<{ ok: true; id: number; order_number: string } | { ok: false; error: string }> {
  const res = await fetch(`${publicApiBase()}/orders`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message_fa ?? 'ثبت سفارش ناموفق بود.' };
  }

  return { ok: true, id: json.data.id as number, order_number: json.data.order_number as string };
}

/** Logged-in buyer: create order from profile and redirect to gateway. */
export async function startLoggedInCheckoutAction(input: {
  product_id: number;
  ref?: string;
  coupon?: string;
  coupon_via_link?: boolean;
  customer_extra_data?: Record<string, string>;
}): Promise<CheckoutResult> {
  const [user, token] = await Promise.all([getCurrentStudent(), getStudentToken()]);
  if (!user || !token) {
    return { ok: false, error: 'برای ادامه باید وارد حساب کاربری شوی.' };
  }

  const orderResult = await createOrder(
    {
      product_id: input.product_id,
      customer_name: buildCustomerName(user.profile, user.name),
      customer_phone: user.mobile,
      customer_email: user.profile?.email ?? undefined,
      customer_extra_data: input.customer_extra_data,
      ref: input.ref,
      coupon: input.coupon,
      coupon_via_link: input.coupon_via_link,
    },
    token,
  );

  if (!orderResult.ok) return orderResult;

  const payment = await requestPayment(orderResult.id, token);
  if (!payment.ok) return payment;

  return { ...payment, order_number: orderResult.order_number };
}

export async function sendGuestCheckoutOtpAction(input: {
  product_id: number;
  customer_name: string;
  customer_phone: string;
  ref?: string;
  coupon?: string;
  coupon_via_link?: boolean;
  customer_extra_data?: Record<string, string>;
}): Promise<
  | { ok: true; checkout_token: string; customer_phone_masked: string | null }
  | { ok: false; error: string }
> {
  const res = await fetch(`${publicApiBase()}/orders/guest-checkout/send-otp`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: input.product_id,
      customer_name: input.customer_name.trim(),
      customer_phone: input.customer_phone.trim(),
      customer_extra_data: input.customer_extra_data,
      ref: input.ref,
      coupon: input.coupon,
      coupon_via_link: input.coupon_via_link,
    }),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message_fa ?? 'ارسال کد تأیید ناموفق بود.' };
  }

  const checkoutToken = json.data?.checkout_token;
  if (typeof checkoutToken !== 'string' || !checkoutToken) {
    return { ok: false, error: 'نشست خرید ایجاد نشد. دوباره تلاش کن.' };
  }

  return {
    ok: true,
    checkout_token: checkoutToken,
    customer_phone_masked: (json.data?.customer_phone_masked as string | null) ?? null,
  };
}

export async function resendGuestCheckoutOtpAction(
  checkoutToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`${publicApiBase()}/orders/guest-checkout/resend-otp`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkout_token: checkoutToken }),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message_fa ?? 'ارسال مجدد کد ناموفق بود.' };
  }

  return { ok: true };
}

export async function verifyGuestCheckoutAndPayAction(input: {
  checkout_token: string;
  code: string;
}): Promise<CheckoutResult> {
  const res = await fetch(`${publicApiBase()}/orders/guest-checkout/verify-and-pay`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      checkout_token: input.checkout_token,
      code: input.code.trim(),
    }),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message_fa ?? 'تأیید کد یا شروع پرداخت ناموفق بود.' };
  }

  const paymentUrl = json?.data?.payment_url;
  if (typeof paymentUrl !== 'string' || !isCheckoutRedirectUrl(paymentUrl)) {
    return { ok: false, error: INVALID_PAYMENT_GATEWAY_URL_MESSAGE };
  }

  return {
    ok: true,
    payment_url: paymentUrl,
    order_number: (json.data?.order_number as string) ?? '',
  };
}

export async function completeOrderProfileAction(input: {
  completion_token: string;
  customer_name: string;
  customer_email?: string;
}): Promise<
  | {
      ok: true;
      post_login_token: string | null;
      customer_phone_masked: string | null;
      otp_sent: boolean;
    }
  | { ok: false; error: string }
> {
  const res = await fetch(`${publicApiBase()}/orders/complete-customer`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message_fa ?? 'ذخیره اطلاعات ناموفق بود.' };
  }

  return {
    ok: true,
    post_login_token: (json.data?.post_login_token as string | null) ?? null,
    customer_phone_masked: (json.data?.customer_phone_masked as string | null) ?? null,
    otp_sent: Boolean(json.data?.otp_sent),
  };
}

async function setStudentTokenCookie(token: string) {
  const { cookies } = await import('next/headers');
  const { STUDENT_TOKEN_COOKIE } = await import('@/lib/student/session');
  const jar = await cookies();
  jar.set(STUDENT_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function loginFromPaymentReceiptAction(receiptToken: string): Promise<
  | { ok: true; needsProfileCompletion: false }
  | { ok: true; needsProfileCompletion: true; completionToken: string }
  | { ok: false; error: string }
> {
  const res = await fetch(`${publicApiBase()}/orders/payment-result/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: receiptToken }),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message_fa ?? 'ورود خودکار به پنل ناموفق بود.' };
  }

  if (json.data?.needs_profile_completion) {
    const completionToken = json.data?.completion_token;
    if (typeof completionToken !== 'string' || !completionToken) {
      return { ok: false, error: 'لینک تکمیل اطلاعات دریافت نشد.' };
    }

    return {
      ok: true,
      needsProfileCompletion: true,
      completionToken,
    };
  }

  const token = json.data?.token;
  if (typeof token !== 'string' || !token) {
    return { ok: false, error: 'توکن ورود دریافت نشد.' };
  }

  await setStudentTokenCookie(token);

  return { ok: true, needsProfileCompletion: false };
}

export async function postPaymentVerifyOtpAction(
  postLoginToken: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`${publicApiBase()}/orders/post-payment-login/verify-otp`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_login_token: postLoginToken, code }),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message_fa ?? 'کد تأیید نامعتبر است.' };
  }

  await setStudentTokenCookie(json.data.token as string);
  return { ok: true };
}

export async function postPaymentResendOtpAction(
  postLoginToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`${publicApiBase()}/orders/post-payment-login/resend-otp`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_login_token: postLoginToken }),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message_fa ?? 'ارسال مجدد کد ناموفق بود.' };
  }

  return { ok: true };
}
