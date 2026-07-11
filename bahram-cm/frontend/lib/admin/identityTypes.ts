export type IdentityStatus =
  | 'not_started'
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'needs_correction'
  | 'approved'
  | 'rejected';

export type IdentityVerificationListItem = {
  id: number;
  uuid?: string;
  user_id: number;
  user_name: string | null;
  user_mobile_masked?: string | null;
  status: IdentityStatus | string;
  first_name: string;
  last_name: string;
  city: string | null;
  version?: number;
  submitted_at: string | null;
  reviewed_at?: string | null;
  ownership_locked?: boolean;
  verification_level?: number;
};

export type IdentityArtifact = {
  id: number;
  type: string;
  mime_type?: string | null;
  view_url?: string | null;
  stream_url?: string | null;
  original_name?: string | null;
};

export type IdentityReview = {
  id: number;
  action: string;
  reason_code?: string | null;
  reviewer_note?: string | null;
  correction_items?: string[] | null;
  reviewer_name?: string | null;
  created_at: string | null;
};

export type IdentityVerificationDetail = IdentityVerificationListItem & {
  national_code_masked?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  expected_video_text?: string | null;
  required_corrections?: string[] | null;
  artifacts?: IdentityArtifact[];
  reviews?: IdentityReview[];
  can_view_documents?: boolean;
  can_reveal_national_code?: boolean;
  mobile_ownership_status?: string | null;
  ownership_failed_attempts?: number;
  ownership_locked_at?: string | null;
};

export type IdentityDashboardStats = {
  pending_review: number;
  needs_correction: number;
  approved_today?: number;
  rejected_today?: number;
  ownership_locked: number;
  submitted?: number;
  under_review?: number;
};

export type IdentityProviderConfig = {
  id: number;
  slug: string;
  label: string;
  capabilities: string[] | null;
  is_enabled: boolean;
  credentials_configured: boolean;
  settings?: Record<string, unknown> | null;
  last_test_status?: string | null;
  last_tested_at?: string | null;
  last_test_message?: string | null;
};

export type IdentityRouteConfig = {
  id: number;
  capability: string;
  primary_provider: string;
  fallback_provider: string | null;
  is_active: boolean;
};

export const IDENTITY_STATUS_LABELS: Record<string, string> = {
  not_started: 'شروع‌نشده',
  draft: 'پیش‌نویس',
  submitted: 'ارسال‌شده',
  under_review: 'در حال بررسی',
  needs_correction: 'نیاز به اصلاح',
  approved: 'تأییدشده',
  rejected: 'ردشده',
};

export const IDENTITY_REASON_LABELS: Record<string, string> = {
  national_card_unreadable: 'تصویر کارت ملی خوانا نیست',
  national_card_not_yours: 'کارت ملی متعلق به شما نیست',
  selfie_unsuitable: 'ویدیوی سلفی مناسب نیست',
  info_mismatch: 'اطلاعات با مدارک مطابقت ندارد',
  image_incomplete: 'تصویر ناقص است',
  other: 'سایر',
};

export const CAPABILITY_LABELS: Record<string, string> = {
  IDENTITY_MANUAL_REVIEW: 'بررسی دستی هویت',
  DOCUMENT_REVIEW: 'بررسی مدارک',
  SELFIE_VIDEO_VERIFICATION: 'تأیید ویدیوی سلفی',
  FACE_LIVENESS: 'زنده‌بودن چهره',
  FACE_MATCH: 'تطبیق چهره',
  MOBILE_NATIONAL_CODE_MATCH: 'تطبیق موبایل و کد ملی',
};
