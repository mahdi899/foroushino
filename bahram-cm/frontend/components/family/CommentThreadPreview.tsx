'use client';

import type { CSSProperties } from 'react';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CommentAvatar } from '@/components/family/CommentAvatar';
import type { FamilyComment } from '@/lib/family/types';

function AvatarStack({ comments }: { comments: FamilyComment[] }) {
  const visible = comments.slice(0, 3);
  const stackWidthPx = visible.length > 0 ? 24 + (visible.length - 1) * 16 : 24;

  return (
    <div className="flex shrink-0 items-center" style={{ width: stackWidthPx }}>
      {visible.map((comment, index) => (
        <CommentAvatar
          key={comment.id}
          name={comment.user.name}
          avatar={comment.user.avatar}
          size="xs"
          className={cn('relative border-2 border-charcoal', index > 0 && '-ms-2')}
          style={{ zIndex: visible.length - index } as CSSProperties}
        />
      ))}
    </div>
  );
}

function commentCountLabel(count: number): string {
  if (count <= 0) return 'اولین نظر را بنویس';
  if (count === 1) return '۱ نظر';
  return `${count.toLocaleString('fa-IR')} نظر`;
}

export function CommentThreadPreview({
  count,
  preview,
  onOpen,
}: {
  count: number;
  preview: FamilyComment[];
  onOpen: () => void;
}) {
  const hasComments = count > 0;

  return (
    <div className="border-t border-white/10 pt-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-start transition hover:bg-white/[0.04]"
      >
        {hasComments && preview.length > 0 ? (
          <AvatarStack comments={preview} />
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-bone/45">
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
        )}
        <span className={cn('flex-1 text-sm', hasComments ? 'text-sky-300/90' : 'text-bone/45')}>
          {commentCountLabel(count)}
        </span>
        <ChevronLeft className="h-4 w-4 shrink-0 text-bone/35" aria-hidden />
      </button>
    </div>
  );
}
