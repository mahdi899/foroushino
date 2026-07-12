export type AdminContentComment = {
  id: number;
  content_type: 'course' | 'mini_course' | 'article' | 'seminar' | 'campaign_writing';
  content_slug: string;
  user_id: number | null;
  author_name: string;
  author_email: string | null;
  author_avatar_url: string | null;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  parent_id: number | null;
  created_at: string | null;
  replies: AdminContentComment[];
};

export const CONTENT_COMMENT_STATUS_LABELS: Record<AdminContentComment['status'], string> = {
  pending: 'در انتظار',
  approved: 'تأیید شده',
  rejected: 'رد شده',
};
