'use client';

import { EmojiRichText } from '@/components/emoji/EmojiRichText';
import { CHAT_TEXT_FONT } from '@/lib/chatbot/emojiFont';
import { cn } from '@/lib/utils';

export function ChatRichText({
  text,
  className,
  emojiClassName,
}: {
  text: string;
  className?: string;
  emojiClassName?: string;
}) {
  return (
    <span style={{ fontFamily: CHAT_TEXT_FONT }}>
      <EmojiRichText
        text={text}
        emojiSize={20}
        className={cn(className)}
        emojiClassName={emojiClassName}
      />
    </span>
  );
}
