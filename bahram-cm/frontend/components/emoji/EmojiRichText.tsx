'use client';

import { AnimatedEmoji, type AnimatedEmojiMode } from '@/components/emoji/AnimatedEmoji';
import { splitEmojiText } from '@/lib/emoji/noto-registry';
import { cn } from '@/lib/utils';

export function EmojiRichText({
  text,
  className,
  emojiSize,
  emojiClassName,
  emojiMode = 'inline',
}: {
  text: string;
  className?: string;
  /** Defaults to ~1.15em when omitted */
  emojiSize?: number;
  emojiClassName?: string;
  /** `static` keeps feed text light (unicode only, no Lottie). */
  emojiMode?: AnimatedEmojiMode | 'static';
}) {
  const parts = splitEmojiText(text);
  const size = emojiSize ?? 18;

  return (
    <span className={cn('whitespace-pre-wrap break-words', className)}>
      {parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.value}</span>;
        if (emojiMode === 'static') {
          return (
            <span
              key={i}
              className={cn('mx-0.5 inline-block align-[-0.15em]', emojiClassName)}
              style={{ fontSize: size, lineHeight: 1 }}
            >
              {part.value}
            </span>
          );
        }
        return (
          <AnimatedEmoji
            key={i}
            notoKey={part.notoSlug}
            size={size}
            mode={emojiMode}
            fallbackChar={part.value}
            className={cn('mx-0.5 align-[-0.15em]', emojiClassName)}
          />
        );
      })}
    </span>
  );
}
