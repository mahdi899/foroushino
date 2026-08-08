'use client';

import { ChevronLeft, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { FamilyComment } from '@/lib/family/types';

function commentCountLabel(count: number, closed = false): string {
  if (closed && count <= 0) return 'نظرات بسته شده است';
  if (count <= 0) return 'اولین نظر را بنویس';
  if (count === 1) return closed ? '۱ نظر · بسته' : '۱ نظر';
  const label = `${count.toLocaleString('fa-IR')} نظر`;
  return closed ? `${label} · بسته` : label;
}

export function CommentThreadPreview({
  count,
  preview: _preview,
  onOpen,
  closed = false,
}: {
  count: number;
  preview: FamilyComment[];
  onOpen: () => void;
  /** When true, members can still open existing threads but cannot compose. */
  closed?: boolean;
}) {
  const hasComments = count > 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="family-post-bubble__comment-link"
    >
      <MessageCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden />
      <span className={cn('flex-1 truncate text-start', hasComments && 'font-medium')}>
        {commentCountLabel(count, closed)}
      </span>
      <ChevronLeft className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
    </button>
  );
}
