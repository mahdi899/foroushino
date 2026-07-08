export interface AdminProduct {
  id: number;
  title: string;
  slug: string;
  type: 'package' | 'normal';
  description: string | null;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  effective_price: number;
  is_active: boolean;
  featured_image: string | null;
  featured_image_url: string | null;
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
    device_limit: number | null;
    status: string;
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
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

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
