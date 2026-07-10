export type AdminMiniCourse = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  description: string | null;
  thumbnail: string | null;
  aparat_hash: string;
  aparat_url: string | null;
  level: string | null;
  duration: string | null;
  sort_order: number;
  is_active: boolean;
  comments_enabled: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminMiniCourseComment = {
  id: number;
  mini_course_id: number;
  author_name: string;
  author_email: string | null;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  parent_id: number | null;
  created_at: string | null;
  replies: AdminMiniCourseComment[];
};

export const MINI_COURSE_COMMENT_STATUS_LABELS: Record<AdminMiniCourseComment['status'], string> = {
  pending: 'در انتظار تأیید',
  approved: 'تأیید شده',
  rejected: 'رد شده',
};
