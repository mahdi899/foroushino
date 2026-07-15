import { cn } from '@/lib/cn';

function initial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0) : 'ب';
}

export function FamilyAuthorAvatar({
  name,
  avatar,
  size = 'md',
  hasStoryRing = false,
  className,
  onClick,
}: {
  name: string;
  avatar?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hasStoryRing?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const sizeClass =
    size === 'sm'
      ? 'h-8 w-8 text-sm'
      : size === 'lg'
        ? 'h-10 w-10 text-base'
        : size === 'xl'
          ? 'h-28 w-28 text-3xl'
          : 'h-9 w-9 text-sm';

  const storyPaddingClass =
    size === 'xl' ? 'p-[3.5px]' : size === 'lg' ? 'p-[2.5px]' : 'p-[2px]';

  const inner = (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold/20 font-bold text-gold',
        sizeClass,
        !hasStoryRing && className,
      )}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        initial(name)
      )}
    </span>
  );

  const content = hasStoryRing ? (
    <span
      className={cn(
        'inline-flex rounded-full bg-gradient-to-tr from-gold via-amber-300 to-gold',
        storyPaddingClass,
        className,
      )}
    >
      <span className="rounded-full bg-[var(--family-surface-panel)] p-[1px]">{inner}</span>
    </span>
  ) : (
    inner
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      >
        {content}
      </button>
    );
  }

  return content;
}
