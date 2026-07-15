'use client';

import { EmojiRichText } from '@/components/emoji/EmojiRichText';

export function FamilyPulseQuote({ body, name }: { body: string; name: string }) {
  return (
    <blockquote className="max-w-[16.5rem] shrink-0 border-s border-gold/30 ps-4 sm:max-w-[20rem]">
      <EmojiRichText
        text={body}
        emojiSize={18}
        className="line-clamp-3 text-start text-sm leading-6 text-bone/80"
      />
      <footer className="mt-2 text-start text-xs font-medium text-gold/75">— {name}</footer>
    </blockquote>
  );
}
