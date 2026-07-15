import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

function avatarInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0) : '؟';
}

export function CommentAvatar({
  name,
  avatar,
  size = 'sm',
  className,
  style,
}: {
  name: string;
  avatar: string | null;
  size?: 'xs' | 'sm';
  className?: string;
  style?: CSSProperties;
}) {
  const sizeClass = size === 'xs' ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-[11px]';

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-500/25 font-bold text-sky-100',
        sizeClass,
        className,
      )}
      style={style}
      title={name}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        avatarInitial(name)
      )}
    </span>
  );
}
