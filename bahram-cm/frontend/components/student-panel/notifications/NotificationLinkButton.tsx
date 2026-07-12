'use client';

import Link from 'next/link';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { isExternalNotificationLink, resolveNotificationLinkLabel } from './notificationLink';

export function NotificationLinkButton({
  link,
  linkLabel,
  variant = 'default',
  onNavigate,
}: {
  link: string;
  linkLabel?: string | null;
  variant?: 'default' | 'compact';
  onNavigate?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const label = resolveNotificationLinkLabel(link, linkLabel);
  if (!label) {
    return null;
  }

  const external = isExternalNotificationLink(link);
  const className = [
    'panel-notification__cta',
    variant === 'compact' ? 'panel-notification__cta--compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span>{label}</span>
      {external ? <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />}
    </>
  );

  function handleNavigate(event: React.MouseEvent<HTMLAnchorElement>) {
    onNavigate?.(event);
  }

  if (external) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className={className} onClick={handleNavigate}>
        {content}
      </a>
    );
  }

  return (
    <Link href={link} className={className} onClick={handleNavigate}>
      {content}
    </Link>
  );
}
