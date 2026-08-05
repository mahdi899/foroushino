import { formatPanelFa } from '@/lib/persian';

export type PageMeta = { current_page: number; last_page: number; total: number };

export type AdminStudent = {
  id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string;
  avatar_url?: string | null;
  /** @deprecated Prefer mobile_masked — full mobile is only via Reveal */
  mobile?: string | null;
  mobile_masked?: string | null;
  email: string | null;
  status: 'active' | 'suspended' | 'blocked';
  verification_level?: number;
  identity_status?: string | null;
  can_reveal_mobile?: boolean;
  orders_count?: number | null;
  course_accesses_count?: number | null;
  tickets_count?: number | null;
  first_login_at: string | null;
  last_login_at: string | null;
  created_at: string | null;
};

export type AdminStudentProfile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  city: string | null;
  age: number | null;
  current_job: string | null;
  instagram: string | null;
  telegram: string | null;
  experience_level: string | null;
  income_goal: string | null;
  avatar: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

export type AdminStudentDetail = AdminStudent & {
  display_name: string;
  mobile_verified_at: string | null;
  profile: AdminStudentProfile | null;
  stats: {
    orders_total: number;
    orders_paid: number;
    orders_unpaid: number;
    course_accesses: number;
    tickets: number;
  };
  course_accesses: {
    id: number;
    product_id: number | null;
    product_title: string | null;
    status: string;
    access_type: string | null;
    source: string | null;
    activated_at: string | null;
  }[];
  orders: {
    id: number;
    order_number: string;
    product_title: string | null;
    amount: number;
    discount_amount: number;
    final_amount: number;
    status: string;
    payment_status: string | null;
    created_at: string | null;
    paid_at: string | null;
  }[];
  tickets: {
    id: number;
    subject: string;
    department: string | null;
    status: string;
    created_at: string | null;
    updated_at: string | null;
  }[];
  sat_applications: { id: number; status: string; created_at: string | null }[];
};

export type AdminCourseAccess = {
  id: number;
  user_id: number;
  user_name: string | null;
  user_mobile: string | null;
  product_title: string | null;
  status: 'active' | 'inactive' | 'revoked';
  source: string;
  activated_at: string | null;
};

export type AdminSpotplayerLicense = {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_mobile: string | null;
  order_id: number | null;
  order_number: string | null;
  product_title: string | null;
  license_key: string | null;
  status: string;
  issued_at: string | null;
  created_at: string | null;
};

export type AdminSeminarGalleryItem = {
  type: 'image' | 'video';
  aspect: '16:9' | '9:16';
  src: string;
  alt?: string | null;
  poster?: string | null;
};

export type AdminSeminarSliderItem = {
  src: string;
  alt?: string | null;
};

export type AdminSeminar = {
  id: number;
  title: string;
  slug: string;
  date: string | null;
  location: string | null;
  status: string | null;
  ended_at: string | null;
  is_ended: boolean;
  price: number | null;
  sale_price: number | null;
  capacity: number | null;
  banner_available: string | null;
  banner_available_mobile: string | null;
  banner_full: string | null;
  banner_full_mobile: string | null;
  cover_image: string | null;
  cover_image_mobile: string | null;
  gallery?: AdminSeminarGalleryItem[];
  gallery_slider?: AdminSeminarSliderItem[];
  promo_enabled: boolean;
  reference_discount_amount?: number;
  product_id: number | null;
  product_slug: string | null;
  attendees_count: number;
  remaining_seats: number | null;
  is_full: boolean;
  assets_count: number;
};

export type AdminSeminarDetail = AdminSeminar & {
  description: string | null;
  cover_image?: string | null;
  cover_image_mobile?: string | null;
  gallery: AdminSeminarGalleryItem[];
  gallery_slider: AdminSeminarSliderItem[];
  attendees: { id: number; user_id: number; name: string | null; mobile: string | null; attendance_status: string }[];
  assets: { id: number; title: string; type: string; is_downloadable: boolean; external_url?: string | null }[];
  certificates: { id: number; user_name: string | null; certificate_number: string; issued_at: string | null }[];
};

export type AdminReferenceChannel = {
  id: number;
  title: string;
  slug: string;
  status: string | null;
  show_in_panel?: boolean;
  show_in_telegram?: boolean;
  price: number;
  product_id: number | null;
  product_slug: string | null;
  telegram_destination_id: number | null;
  telegram_destination_title: string | null;
  cover_image: string | null;
  cover_image_mobile?: string | null;
  entitlements_count: number;
};

export type AdminReferenceChannelDetail = AdminReferenceChannel & {
  description: string | null;
  entitlements: {
    id: number;
    user_id: number;
    name: string | null;
    mobile: string | null;
    source: string;
    order_id: number | null;
    created_at: string | null;
  }[];
};

export type AdminReferralConversion = {
  id: number;
  referrer_name: string | null;
  referrer_mobile: string | null;
  buyer_name: string | null;
  order_number: string | null;
  status: 'pending' | 'approved' | 'rejected';
  cashback_amount: number;
  converted_at: string | null;
};

export type AdminReferralCode = {
  id: number;
  code: string;
  user_name: string | null;
  user_mobile: string | null;
  is_active: boolean;
  clicks_count: number;
};

export type AdminVerifiedBankAccount = {
  id: number;
  user_id: number;
  user_name: string | null;
  user_mobile: string | null;
  masked_card_number: string | null;
  masked_iban: string | null;
  holder_name: string | null;
  bank_name: string | null;
  status: 'pending' | 'verified' | 'rejected';
  admin_note: string | null;
  created_at: string | null;
  admin_reviewed_at: string | null;
};

export type AdminCashbackPayout = {
  id: number;
  user_name: string | null;
  user_mobile: string | null;
  amount: number;
  masked_card_number: string | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  admin_note: string | null;
  paid_at: string | null;
  created_at: string | null;
};

export type AdminCashbackPayoutRevealed = AdminCashbackPayout & {
  card_number: string;
  card_holder_name: string | null;
};

export type AdminSatApplication = {
  id: number;
  name: string;
  mobile: string;
  city: string | null;
  age: number | null;
  status: 'received' | 'reviewing' | 'accepted' | 'rejected';
  admin_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  synced_to_sat_at: string | null;
  sat_sync_error: string | null;
};

export type AdminSatIntegrationConfig = {
  enabled: boolean;
  api_url: string | null;
  api_token_set: boolean;
  api_token_preview: string | null;
};

export type AdminTicket = {
  id: number;
  subject: string;
  department: string | null;
  tech_escalation: 'tech_support' | 'tech_manager' | 'super_admin' | 'resolved' | null;
  tech_escalation_label?: string | null;
  tech_resolved_at?: string | null;
  tech_resolved_by?: number | null;
  tech_resolver_name?: string | null;
  status: 'open' | 'in_review' | 'answered' | 'waiting_user' | 'closed';
  priority: 'low' | 'normal' | 'high';
  user_id?: number;
  user_name: string | null;
  user_mobile: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

export type AdminTicketMessage = {
  id: number;
  message: string;
  is_admin_reply: boolean;
  is_internal?: boolean;
  sender_name?: string | null;
  sender_role_label?: string | null;
  has_attachment: boolean;
  created_at: string | null;
};

export type AdminTicketDetail = AdminTicket & {
  user_id: number;
  messages: AdminTicketMessage[];
  can_reply_to_user?: boolean;
  must_use_internal?: boolean;
};

export type AdminTicketUserGroup = {
  user_id: number;
  name: string | null;
  mobile: string | null;
  tickets_count: number;
  open_count: number;
  last_ticket_at: string | null;
};

export type AdminTicketReport = {
  summary: { total: number; open: number; in_review?: number; answered: number; waiting_user: number; closed: number };
  by_department: { department: string; count: number }[];
  by_day: { date: string; created: number; closed: number }[];
  top_users: { user_id: number; name: string | null; mobile: string | null; count: number }[];
};

export type AdminNotification = {
  id: number;
  title: string;
  body: string;
  type: string | null;
  link: string | null;
  link_label: string | null;
  recipients_count: number;
  created_at: string | null;
};

export type AdminAudienceSegment = { key: string; label: string; count: number };

export type AdminSmsLog = {
  id: number;
  mobile: string;
  user_name: string | null;
  message: string;
  event_key: string | null;
  provider: string | null;
  status: string;
  is_fallback_attempt?: boolean;
  sent_at: string | null;
  created_at: string | null;
};

export const STUDENT_STATUS_LABELS: Record<string, string> = {
  active: 'فعال',
  suspended: 'معلق',
  blocked: 'مسدود',
};

export const COURSE_ACCESS_STATUS_LABELS: Record<string, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
  revoked: 'لغو شده',
};

export const REFERRAL_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  approved: 'تأیید شده',
  rejected: 'رد شده',
};

export const CASHBACK_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تأیید شده',
  paid: 'پرداخت شده',
  rejected: 'رد شده',
};

export const SAT_STATUS_LABELS: Record<string, string> = {
  received: 'دریافت شده',
  reviewing: 'در حال بررسی',
  accepted: 'پذیرفته شده',
  rejected: 'رد شده',
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'باز',
  in_review: 'در حال بررسی',
  answered: 'پاسخ داده شده',
  waiting_user: 'در انتظار پاسخ کاربر',
  closed: 'بسته شده',
};

export const TICKET_DEPARTMENT_LABELS: Record<string, string> = {
  technical: 'فنی',
  financial: 'مالی',
  course: 'دوره',
  general: 'عمومی',
};

export const TICKET_TECH_ESCALATION_LABELS: Record<string, string> = {
  tech_support: 'پشتیبان فنی',
  tech_manager: 'مدیر فنی',
  super_admin: 'مدیر کل',
  resolved: 'حل‌شده — آماده اعلام',
};

export type TicketTechEscalation = 'tech_support' | 'tech_manager' | 'super_admin' | 'resolved';

export type TicketTechActorLevel = 'tech_support' | 'tech_manager' | 'super_admin';

export const TICKET_DEPARTMENT_OPTIONS = [
  { value: '', label: 'همه بخش‌ها' },
  { value: 'technical', label: 'فنی' },
  { value: 'financial', label: 'مالی' },
  { value: 'course', label: 'دوره' },
  { value: 'general', label: 'عمومی' },
] as const;

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: 'کم',
  normal: 'متوسط',
  high: 'فوری',
};

export function formatToman(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${formatPanelFa(value)} تومان`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fa-IR');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fa-IR');
}
