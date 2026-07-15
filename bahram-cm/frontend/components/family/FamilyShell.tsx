'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Centered Telegram-style column for family routes. */
export function FamilyShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}>
      {children}
    </div>
  );
}

export function FamilyMain({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn('relative flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      {children}
    </main>
  );
}
