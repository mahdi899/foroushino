export type FamilyPostType =
  | 'text'
  | 'voice'
  | 'video'
  | 'image'
  | 'image_album'
  | 'article'
  | 'mixed'
  | 'reply';

export type FamilyPostBlockType =
  | 'text'
  | 'audio'
  | 'video'
  | 'image'
  | 'article_reference'
  | 'reply_context'
  | 'action_reference';

export type FamilyActionType =
  | 'commitment'
  | 'confirmation'
  | 'number'
  | 'single_choice'
  | 'multi_choice'
  | 'short_text'
  | 'scale';

export type FamilyReactionType = 'fire' | 'heart' | 'target' | 'clap';

export interface FamilyMediaBlock {
  id: number;
  type: 'voice' | 'video' | 'image';
  url: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  waveform: number[] | null;
  mime_type: string | null;
  status: string;
}

export interface FamilyArticleBlock {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail: string | null;
  url: string;
}

export interface FamilyPostBlock {
  id: number;
  type: FamilyPostBlockType;
  position: number;
  text: string | null;
  data: Record<string, unknown> | null;
  media: FamilyMediaBlock | null;
  article: FamilyArticleBlock | null;
}

export interface FamilyActionOption {
  id: number;
  label: string;
  value: string;
  position: number;
}

export interface FamilyAction {
  id: number;
  type: FamilyActionType;
  prompt: string;
  config: Record<string, unknown> | null;
  options: FamilyActionOption[];
}

export interface FamilyPostStats {
  fire: number;
  heart: number;
  target: number;
  clap: number;
  comments: number;
  action_responses: number;
}

export interface FamilyPost {
  id: number;
  type: FamilyPostType;
  is_important: boolean;
  published_at: string | null;
  author: { name: string };
  blocks: FamilyPostBlock[];
  actions: FamilyAction[];
  reply_context?: { comment_body: string; user_name: string | null } | null;
  stats: FamilyPostStats;
  user_reaction: FamilyReactionType | null;
}

export interface FamilyFeedMeta {
  next_cursor: string | null;
  guest: boolean;
  display_name: string;
  member_count?: number;
  onboarding_completed?: boolean;
}

export interface FamilyFeedResponse {
  data: FamilyPost[];
  meta: FamilyFeedMeta;
}

export interface FamilyComment {
  id: number;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user: { name: string; avatar: string | null };
  rejection_reason?: string | null;
  is_pending_mine: boolean;
}

export interface FamilyNotification {
  id: number;
  title: string;
  body: string;
  type: string;
  link: string | null;
  link_label: string | null;
  read_at: string | null;
  created_at: string;
}

export interface FamilyMeResponse {
  is_member: boolean;
  display_name: string;
  member_count?: number;
  onboarding_completed?: boolean;
  joined_at?: string;
}

export interface FamilyPulseItem {
  id: number;
  body: string;
  name: string;
  at: string | null;
}
