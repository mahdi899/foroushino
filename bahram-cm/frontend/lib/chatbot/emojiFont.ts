import { SITE_FONT_STACK } from '@/lib/fonts';

/** Site text stack — IRANSansXFaNum only (no external/system UI fonts). */
export const CHAT_TEXT_FONT = SITE_FONT_STACK;

export {
  SITE_EMOJIS as LOCAL_EMOJIS,
  SITE_EMOJIS as QUICK_EMOJIS,
  SITE_EMOJI_BY_CHAR as LOCAL_EMOJI_BY_CHAR,
  splitEmojiText as splitChatEmojiText,
  type SiteEmoji as LocalEmoji,
} from '@/lib/emoji/noto-registry';

/** @deprecated Use CHAT_TEXT_FONT for text; EmojiRichText for emoji in messages. */
export const CHAT_EMOJI_FONT = CHAT_TEXT_FONT;

/** Shared frosted-glass surface — legacy iOS; prefer chatbotThemeClasses() on the public site. */
export const CHAT_GLASS_SURFACE =
  'border border-white/70 bg-white/42 shadow-[0_4px_24px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl backdrop-saturate-[180%] supports-[backdrop-filter]:bg-white/30';
