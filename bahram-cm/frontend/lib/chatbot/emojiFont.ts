/** Site text stack — IRANSansXFaNum only (no external/system UI fonts). */
export const CHAT_TEXT_FONT = 'var(--font-iran), IRANSansXFaNum, Tahoma, sans-serif';

/** @deprecated Use CHAT_TEXT_FONT for text; ChatRichText for emoji in messages. */
export const CHAT_EMOJI_FONT = CHAT_TEXT_FONT;

export type LocalEmoji = {
  char: string;
  src: string;
  label: string;
};

/** Self-hosted emoji icons — no system emoji font fallback. */
export const LOCAL_EMOJIS: LocalEmoji[] = [
  { char: '😊', src: '/icons/emoji/smile.svg', label: 'لبخند' },
  { char: '🙂', src: '/icons/emoji/slight-smile.svg', label: 'لبخند ملایم' },
  { char: '😁', src: '/icons/emoji/grin.svg', label: 'خندش' },
  { char: '🙏', src: '/icons/emoji/pray.svg', label: 'تشکر' },
  { char: '❤️', src: '/icons/emoji/heart.svg', label: 'قلب' },
  { char: '👍', src: '/icons/emoji/thumbs-up.svg', label: 'عالی' },
  { char: '📚', src: '/icons/emoji/book.svg', label: 'دوره' },
  { char: '✨', src: '/icons/emoji/sparkles.svg', label: 'درخشش' },
  { char: '💚', src: '/icons/emoji/green-heart.svg', label: 'قلب سبز' },
  { char: '⭐', src: '/icons/emoji/star.svg', label: 'ستاره' },
  { char: '👋', src: '/icons/emoji/wave.svg', label: 'سلام' },
  { char: '💬', src: '/icons/emoji/speech.svg', label: 'پیام' },
];

export const LOCAL_EMOJI_BY_CHAR = Object.fromEntries(LOCAL_EMOJIS.map((e) => [e.char, e])) as Record<
  string,
  LocalEmoji
>;

/** Quick picks for chat composer. */
export const QUICK_EMOJIS = LOCAL_EMOJIS;

/** Shared frosted-glass surface — legacy iOS; prefer chatbotThemeClasses() on the public site. */
export const CHAT_GLASS_SURFACE =
  'border border-white/70 bg-white/42 shadow-[0_4px_24px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl backdrop-saturate-[180%] supports-[backdrop-filter]:bg-white/30';

/** Split message text into plain segments and known local emoji tokens. */
export function splitChatEmojiText(text: string): Array<{ type: 'text'; value: string } | { type: 'emoji'; value: string }> {
  if (!text) return [];
  const chars = [...LOCAL_EMOJIS.map((e) => e.char), ...LOCAL_EMOJIS.map((e) => e.char.replace(/\uFE0F/g, ''))];
  const pattern = chars
    .sort((a, b) => b.length - a.length)
    .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  if (!pattern) return [{ type: 'text', value: text }];
  const re = new RegExp(`(${pattern})`, 'g');
  const parts = text.split(re).filter(Boolean);
  return parts.map((part) =>
    LOCAL_EMOJI_BY_CHAR[part] || LOCAL_EMOJI_BY_CHAR[`${part}\uFE0F`] || LOCAL_EMOJI_BY_CHAR[part.replace(/\uFE0F/g, '')]
      ? { type: 'emoji' as const, value: part }
      : { type: 'text' as const, value: part },
  );
}
