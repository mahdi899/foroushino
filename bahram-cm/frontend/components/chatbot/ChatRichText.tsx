'use client';

import { LOCAL_EMOJI_BY_CHAR, CHAT_TEXT_FONT, splitChatEmojiText } from '@/lib/chatbot/emojiFont';
import { cn } from '@/lib/utils';

function resolveEmoji(char: string) {
  return (
    LOCAL_EMOJI_BY_CHAR[char] ??
    LOCAL_EMOJI_BY_CHAR[`${char}\uFE0F`] ??
    LOCAL_EMOJI_BY_CHAR[char.replace(/\uFE0F/g, '')]
  );
}

export function ChatRichText({
  text,
  className,
  emojiClassName = 'mx-0.5 inline-block h-[1.15em] w-[1.15em] align-[-0.15em]',
}: {
  text: string;
  className?: string;
  emojiClassName?: string;
}) {
  const parts = splitChatEmojiText(text);

  return (
    <span className={cn('whitespace-pre-wrap break-words', className)} style={{ fontFamily: CHAT_TEXT_FONT }}>
      {parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.value}</span>;
        const emoji = resolveEmoji(part.value);
        if (!emoji) return <span key={i}>{part.value}</span>;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={emoji.src} alt="" aria-hidden className={emojiClassName} width={20} height={20} />
        );
      })}
    </span>
  );
}
