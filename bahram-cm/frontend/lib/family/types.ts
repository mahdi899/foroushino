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

export type FamilyReactionType =
  | 'fire'
  | 'heart'
  | 'target'
  | 'clap'
  | 'thumbs_up'
  | 'laugh'
  | 'sad'
  | 'party'
  | 'star'
  | 'rocket'
  | 'eyes'
  | 'pray'
  | 'muscle'
  | 'hundred'
  | 'wink';

export interface FamilyMediaBlock {
  id: number;
  type: 'voice' | 'video' | 'image';
  url: string | null;
  poster_url?: string | null;
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

export interface FamilyActionOptionResult {
  value: string;
  label: string;
  count: number;
  percent: number;
}

export interface FamilyActionResults {
  total: number;
  options: FamilyActionOptionResult[];
}

export interface FamilyAction {
  id: number;
  type: FamilyActionType;
  prompt: string;
  config: Record<string, unknown> | null;
  options: FamilyActionOption[];
  results?: FamilyActionResults | null;
  responded?: boolean;
  user_response?: Record<string, unknown> | null;
}

export interface FamilyPostStats {
  fire: number;
  heart: number;
  target: number;
  clap: number;
  thumbs_up: number;
  laugh: number;
  sad: number;
  party: number;
  star: number;
  rocket: number;
  eyes: number;
  pray: number;
  muscle: number;
  hundred: number;
  wink: number;
  comments: number;
  action_responses: number;
  views: number;
}

export interface FamilyPost {
  id: number;
  type: FamilyPostType;
  is_important: boolean;
  is_pinned?: boolean;
  /** When false, members cannot open or add comments on this post. */
  comments_enabled?: boolean;
  published_at: string | null;
  author: { name: string; avatar?: string | null };
  blocks: FamilyPostBlock[];
  actions: FamilyAction[];
  reply_context?: { comment_body: string; user_name: string | null } | null;
  stats: FamilyPostStats;
  user_reaction: FamilyReactionType | null;
  comment_preview?: FamilyComment[];
}

export interface FamilyBranding {
  display_name: string;
  profile_name: string;
  profile_avatar: string | null;
  community_avatar: string | null;
  branding_version?: number | null;
  has_active_stories?: boolean;
  latest_story_id?: number | null;
}

export interface FamilyStoryMedia {
  id: number;
  type: string;
  url: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  mime_type: string | null;
}

export interface FamilyStory {
  id: number;
  caption: string | null;
  published_at: string | null;
  expires_at: string | null;
  media: FamilyStoryMedia | null;
}

export interface FamilyFeedMeta {
  next_cursor: string | null;
  prev_cursor?: string | null;
  has_newer?: boolean;
  has_older?: boolean;
  guest: boolean;
  needs_auth?: boolean;
  needs_join?: boolean;
  display_name: string;
  branding?: FamilyBranding;
  has_active_stories?: boolean;
  member_count?: number;
  onboarding_completed?: boolean;
  is_staff?: boolean;
  feed_revision?: number;
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
  branding?: FamilyBranding;
  has_active_stories?: boolean;
  member_count?: number;
  onboarding_completed?: boolean;
  joined_at?: string;
  is_staff?: boolean;
}

export interface FamilyPulseItem {
  id: number;
  body: string;
  name: string;
  at: string | null;
}
