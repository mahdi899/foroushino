'use client';

import { ThemeIconButton } from '@/components/theme/ThemeIconButton';

/** Floating light/dark toggle — always reachable on mobile (even when topbar is hidden). */
export function FamilyMobileThemeButton() {
  return <ThemeIconButton className="family-mobile-theme-btn fixed end-3 z-40 lg:hidden" />;
}
