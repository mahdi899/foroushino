export type MiniCourseApiRecord = {
  slug: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  aparat_hash: string;
  level?: string | null;
  duration?: string | null;
  comments_enabled: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
};

export type MiniCourseCommentRecord = {
  id: number;
  author_name: string;
  body: string;
  created_at: string | null;
  replies?: MiniCourseCommentRecord[];
};
