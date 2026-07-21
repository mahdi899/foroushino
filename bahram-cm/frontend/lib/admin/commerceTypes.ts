import { formatPanelFa } from '@/lib/persian';

export type AdminProductType =
  | 'package'
  | 'normal'
  | 'course_spotplayer'
  | 'manual_service'
  | 'event'
  | 'mini_course';

export interface AdminProduct {
  id: number;
  title: string;
  slug: string;
  type: AdminProductType;
  description: string | null;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  effective_price: number;
  referral_cashback_enabled?: boolean;
  referral_cashback_type?: 'percent' | 'fixed' | null;
  referral_cashback_value?: number | null;
  is_active: boolean;
  show_in_telegram?: boolean;
  telegram_list_visibility?: 'public' | 'private';
  telegram_sort_order?: number;
  featured_image: string | null;
  featured_image_url: string | null;
  show_on_courses?: boolean;
  featured_listing?: boolean;
  course_level?: string | null;
  course_duration?: string | null;
  landing_href?: string | null;
  spotplayer_course_id: string | null;
  spotplayer_product_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string | null;
}

export interface AdminOrder {
  id: number;
  order_number: string;
  product_id: number;
  product_title: string | null;
  product_type?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_national_code: string | null;
  amount: number;
  discount_amount: number;
  final_amount: number;
  status: string;
  payment_status: string;
  spotplayer_license_code: string | null;
  sms_sent_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  payment_ref_id?: string | null;
}

export type AdminOrderPayment = {
  id: number;
  gateway: string;
  gateway_label: string;
  mode: 'sandbox' | 'live';
  mode_label: string;
  authority: string | null;
  ref_id: string | null;
  amount: number;
  status: string;
  card_pan?: string | null;
  verify_code?: number | string | null;
  paid_at: string | null;
  created_at: string | null;
};

export type AdminOrderDetail = AdminOrder & {
  user_id: number | null;
  user_name: string | null;
  user_mobile: string | null;
  referral_code: string | null;
  customer_extra_data: Record<string, unknown> | null;
  product: {
    id: number;
    title: string;
    spotplayer_course_id: string | null;
    spotplayer_product_id: string | null;
  } | null;
  payments: AdminOrderPayment[];
  spotplayer_license: {
    id: number;
    license_key: string | null;
    license_url: string | null;
    spotplayer_course_id: string | null;
    spotplayer_license_id?: string | null;
    device_limit: number | null;
    status: string;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  course_access: {
    id: number;
    status: string;
    source: string;
    access_type: string;
    activated_at: string | null;
  } | null;
  referral_conversion: {
    id: number;
    status: string;
    cashback_amount: number;
    referrer_name: string | null;
    referrer_mobile: string | null;
  } | null;
};

export interface AdminFaq {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
}

export interface AdminStudentTestimonial {
  id: number;
  slug: string;
  name: string;
  role: string;
  before_text: string;
  after_text: string;
  summary: string;
  meta_title: string | null;
  meta_description: string | null;
  metric_label: string | null;
  metric_value: string | null;
  body: string;
  portrait_image: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
}

export interface PaymentSettingsData {
  sandbox_mode: boolean;
  callback_url: string | null;
  is_active: boolean;
  currency: 'IRT' | 'IRR';
  description_template: string | null;
  has_merchant_id: boolean;
  default_callback_url: string;
  effective_callback_url?: string;
  uses_custom_callback?: boolean;
  app_url?: string;
  frontend_payment_result_url?: string;
}

export interface SmsSpotplayerSettingsData {
  sms_provider: string;
  sms_sender_number: string | null;
  sms_pattern_code: string | null;
  is_sms_active: boolean;
  test_phone: string | null;
  purchase_message_template: string | null;
  has_sms_api_key: boolean;
  spotplayer_base_url: string | null;
  is_spotplayer_active: boolean;
  default_license_duration: number | null;
  has_spotplayer_api_key: boolean;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  fulfilled: 'تحویل داده‌شده',
  failed: 'ناموفق',
  cancelled: 'لغوشده',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  paid: 'پرداخت‌شده',
  failed: 'ناموفق',
};

export const PRODUCT_TYPE_LABELS: Record<AdminProductType, string> = {
  normal: 'عادی',
  package: 'پکیج',
  course_spotplayer: 'دوره SpotPlayer',
  manual_service: 'خدمت دستی',
  event: 'رویداد',
  mini_course: 'مینی‌دوره',
};

export const PAYMENT_RECORD_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  paid: 'موفق',
  failed: 'ناموفق',
  canceled: 'لغوشده',
};

export const GATEWAY_LABELS: Record<string, string> = {
  zarinpal: 'زرین‌پال',
};

export const COURSE_ACCESS_SOURCE_LABELS: Record<string, string> = {
  zarinpal: 'خرید زرین‌پال',
  manual: 'دستی ادمین',
  import: 'Import',
};

export function formatToman(amount: number): string {
  return `${formatPanelFa(amount)} تومان`;
}

export type AdminDiscountType = 'percent' | 'fixed';
export type AdminDiscountRestriction = 'all' | 'specific_users' | 'prior_buyers' | 'specific_products';

export interface AdminDiscountCode {
  id: number;
  code: string;
  title: string;
  description: string | null;
  discount_type: AdminDiscountType;
  discount_value: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  requires_link: boolean;
  restriction: AdminDiscountRestriction;
  uses_count: number;
  product_ids: number[];
  products?: { id: number; title: string }[];
  user_ids: number[];
  users?: { id: number; name: string; mobile: string | null }[];
  created_at: string | null;
  updated_at?: string | null;
}

export const DISCOUNT_TYPE_LABELS: Record<AdminDiscountType, string> = {
  percent: 'درصدی',
  fixed: 'مبلغ ثابت (تومان)',
};

export const DISCOUNT_RESTRICTION_LABELS: Record<AdminDiscountRestriction, string> = {
  all: 'همه کاربران',
  specific_users: 'دانشجویان مشخص',
  prior_buyers: 'خریداران قبلی',
  specific_products: 'محصولات مشخص',
};

export type OrderAnalyticsSlice = {
  key: string;
  label: string;
  count: number;
  amount?: number;
};

export type OrderAnalyticsDaily = {
  date: string;
  orders: number;
  revenue: number;
};

export type OrderAnalyticsProduct = {
  product_id: number;
  title: string;
  count: number;
  revenue: number;
};

export type OrderAnalytics = {
  period_days: number | null;
  summary: {
    total_orders: number;
    paid_orders: number;
    total_revenue: number;
    pending_revenue: number;
    avg_order_value: number;
    conversion_rate: number;
  };
  fulfillment: {
    licenses_issued: number;
    sms_sent: number;
    course_access_granted: number;
    referral_orders: number;
  };
  by_status: OrderAnalyticsSlice[];
  by_payment_status: OrderAnalyticsSlice[];
  by_gateway: OrderAnalyticsSlice[];
  by_gateway_mode: OrderAnalyticsSlice[];
  daily: OrderAnalyticsDaily[];
  by_product: OrderAnalyticsProduct[];
  recent_transactions: {
    id: number;
    order_id: number;
    order_number: string | null;
    customer_name: string | null;
    product_title: string | null;
    gateway: string;
    gateway_label: string;
    mode: 'sandbox' | 'live';
    mode_label: string;
    authority: string | null;
    ref_id: string | null;
    card_pan?: string | null;
    amount: number;
    paid_at: string | null;
  }[];
};
