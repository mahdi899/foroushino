'use client';

import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { FamilyComment } from '@/lib/family/types';

function avatarInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0) : '؟';
}

function AvatarStack({ comments }: { comments: FamilyComment[] }) {
  const visible = comments.slice(0, 3);

  return (
    <div className="flex items-center -space-x-2 space-x-reverse">
      {visible.map((comment) => (
        <span
          key={comment.id}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-charcoal bg-sky-500/30 text-[10px] font-bold text-sky-100"
          title={comment.user.name}
        >
          {comment.user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comment.user.avatar} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            avatarInitial(comment.user.name)
          )}
        </span>
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
        {hasComments && preview.length > 0 ? <AvatarStack comments={preview} /> : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-[10px] text-sky-300/80">
            💬
          </span>
        )}
        <span className={cn('flex-1 text-sm', hasComments ? 'text-sky-300/90' : 'text-bone/45')}>
          {commentCountLabel(count)}
        </span>
        <ChevronLeft className="h-4 w-4 shrink-0 text-bone/35" aria-hidden />
      </button>

      {preview.length > 0 && (
        <ul className="mt-1 space-y-2 border-t border-white/[0.06] pt-2">
          {preview.map((comment) => (
            <li key={comment.id}>
              <button
                type="button"
                onClick={onOpen}
                className="flex w-full items-start gap-2 rounded-lg px-1 py-0.5 text-start transition hover:bg-white/[0.03]"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-bone/70">
                  {avatarInitial(comment.user.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-sky-300/80">{comment.user.name}</span>
                  <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-bone/75">{comment.body}</p>
                </span>
              </button>
            </li>
          ))}
          {count > preview.length && (
            <li>
              <button
                type="button"
                onClick={onOpen}
                className="px-1 text-xs font-medium text-sky-300/70 transition hover:text-sky-200"
              >
                مشاهده {count.toLocaleString('fa-IR')} نظر
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
