export type ContentCommentType = 'course' | 'mini_course' | 'article' | 'seminar' | 'campaign_writing';

export type ContentCommentRecord = {
  id: number;
  author_name: string;
  author_avatar_url?: string | null;
  body: string;
  created_at?: string | null;
  replies?: ContentCommentRecord[];
};

export type ContentCommentAuthor = {
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export const CONTENT_COMMENT_TYPE_LABELS: Record<ContentCommentType, string> = {
  course: 'دوره',
  mini_course: 'مینی‌دوره',
  article: 'مقاله',
  seminar: 'سمینار',
  campaign_writing: 'کمپین‌نویسی',
};

export const CONTENT_COMMENT_PUBLIC_PATH: Record<ContentCommentType, (slug: string) => string> = {
  course: (slug) => `/courses/${slug}`,
  mini_course: (slug) => `/mini-courses/${slug}`,
  article: (slug) => `/insights/${slug}`,
  seminar: (slug) => `/seminars/${slug}`,
  campaign_writing: () => '/course/campaign-writing',
};
