import { ProfileVerifiedBadge } from '@/components/student-panel/layout/ProfileVerifiedBadge';
import { cn } from '@/lib/cn';
import { resolveFamilyMediaUrl } from '@/lib/family/mediaPlaybackUrl';
import { appendAvatarCacheBuster } from '@/lib/student/avatarCache';

function initial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0) : 'ب';
}

export function FamilyAuthorAvatar({
  name,
  avatar,
  size = 'md',
  hasStoryRing = false,
  storyUnseen = true,
  verified = false,
  verifiedLabel = 'تأییدشده',
  avatarVersion,
  className,
  onClick,
}: {
  name: string;
  avatar?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hasStoryRing?: boolean;
  /** When stories exist: unseen → animated TG ring; seen → muted ring. */
  storyUnseen?: boolean;
  verified?: boolean;
  verifiedLabel?: string;
  avatarVersion?: number | null;
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

  const ringSizeClass =
    size === 'xl'
      ? 'family-story-ring--xl'
      : size === 'lg'
        ? 'family-story-ring--lg'
        : size === 'sm'
          ? 'family-story-ring--sm'
          : 'family-story-ring--md';

  const resolvedAvatar = avatar ? resolveFamilyMediaUrl(avatar) ?? avatar : null;
  const avatarSrc = resolvedAvatar
    ? appendAvatarCacheBuster(resolvedAvatar, avatarVersion)
    : null;

  const avatarFace = (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--family-tg-pinned-accent)_12%,var(--family-bubble-incoming))] font-bold text-[var(--family-tg-pinned-accent)]',
        sizeClass,
        !hasStoryRing && className,
      )}
    >
      {avatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={avatarSrc}
          src={avatarSrc}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initial(name)
      )}
    </span>
  );

  const content = hasStoryRing ? (
    <span
      className={cn(
        'family-story-ring inline-flex rounded-full',
        ringSizeClass,
        storyUnseen ? 'family-story-ring--unseen' : 'family-story-ring--seen',
        className,
      )}
    >
      <span className="family-story-ring__inner">{avatarFace}</span>
    </span>
  ) : (
    avatarFace
  );

  const verifiedSizeClass =
    size === 'xl'
      ? 'family-author-avatar__verified--xl'
      : size === 'lg'
        ? 'family-author-avatar__verified--lg'
        : size === 'sm'
          ? 'family-author-avatar__verified--sm'
          : 'family-author-avatar__verified--md';

  const shell = (
    <span className="family-author-avatar__shell inline-flex shrink-0">
      {content}
      {verified ? (
        <span
          className={cn('family-author-avatar__verified', verifiedSizeClass)}
          title={verifiedLabel}
          aria-label={verifiedLabel}
        >
          <ProfileVerifiedBadge />
        </span>
      ) : null}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={hasStoryRing ? `مشاهده استوری ${name}` : undefined}
        className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--family-tg-pinned-accent)]/50"
      >
        {shell}
      </button>
    );
  }

  return shell;
}
