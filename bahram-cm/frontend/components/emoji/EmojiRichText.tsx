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
  emojiMode?: AnimatedEmojiMode;
}) {
  const parts = splitEmojiText(text);

  return (
    <span className={cn('whitespace-pre-wrap break-words', className)}>
      {parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.value}</span>;
        return (
          <AnimatedEmoji
            key={i}
            notoKey={part.notoKey}
            size={emojiSize}
            mode={emojiMode}
            className={cn('mx-0.5 align-[-0.15em]', emojiClassName)}
          />
        );
      })}
    </span>
  );
}
