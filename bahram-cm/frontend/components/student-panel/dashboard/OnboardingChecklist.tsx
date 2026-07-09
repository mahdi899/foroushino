'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Briefcase,
  Check,
  Gift,
  User,
  type LucideIcon,
} from 'lucide-react';
import { PanelAcademyLinkSheet } from '@/components/student-panel/academy/PanelAcademyLinkSheet';
import { ACADEMY_LINK_META } from '@/components/student-panel/academy/academyLinkMeta';
import { markOnboardingStepAction } from '@/lib/student/panelActions';

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  url: string | null;
}

const CLICK_TRACKED = new Set(['telegram_channel', 'rubika_channel', 'telegram_bot', 'customer_club']);

const EXTERNAL_SHEET_KEYS = new Set(['telegram_channel', 'rubika_channel', 'telegram_bot']);

const STEP_SHORT_LABELS: Record<string, string> = {
  profile: 'پروفایل',
  telegram_channel: 'تلگرام',
  rubika_channel: 'روبیکا',
  telegram_bot: 'ربات',
  course: 'دوره',
  customer_club: 'باشگاه',
  sat: 'سات',
};

const STEP_ICONS: Record<string, LucideIcon> = {
  profile: User,
  telegram_channel: ACADEMY_LINK_META.telegram_channel.icon,
  rubika_channel: ACADEMY_LINK_META.rubika_channel.icon,
  telegram_bot: ACADEMY_LINK_META.telegram_bot.icon,
  course: BookOpen,
  customer_club: Gift,
  sat: Briefcase,
};

function StepVisual({ item, isNext }: { item: ChecklistItem; isNext: boolean }) {
  const Icon = STEP_ICONS[item.key] ?? User;

  if (item.done) {
    return (
      <span className="panel-onboarding-step__icon panel-onboarding-step__icon--done" aria-hidden>
        <Check size={18} strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span
      className={`panel-onboarding-step__icon${isNext ? ' panel-onboarding-step__icon--active' : ''}`}
      aria-hidden
    >
      <Icon size={18} strokeWidth={2} />
    </span>
  );
}

function StepCard({
  item,
  isNext,
  onOpenSheet,
  onTrackedClick,
}: {
  item: ChecklistItem;
  isNext: boolean;
  onOpenSheet?: () => void;
  onTrackedClick?: () => void;
}) {
  const state = item.done ? 'done' : isNext ? 'active' : 'pending';

  const body = (
    <>
      <StepVisual item={item} isNext={isNext} />
      <span
        className={`panel-onboarding-step__label${item.done ? ' panel-onboarding-step__label--done' : ''}`}
      >
        <span className="panel-onboarding-step__label-full">{item.label}</span>
        <span className="panel-onboarding-step__label-short">
          {STEP_SHORT_LABELS[item.key] ?? item.label}
        </span>
      </span>
    </>
  );

  const className = `panel-onboarding-step panel-onboarding-step--${state}`;

  if (item.done) {
    return (
      <li className={className} data-state={state}>
        {body}
      </li>
    );
  }

  if (EXTERNAL_SHEET_KEYS.has(item.key)) {
    return (
      <li className={className} data-state={state}>
        <button type="button" onClick={onOpenSheet} className="panel-onboarding-step__link">
          {body}
        </button>
      </li>
    );
  }

  if (!item.url) {
    return (
      <li className={className} data-state={state}>
        {body}
      </li>
    );
  }

  const isExternal = item.url.startsWith('http');

  return (
    <li className={className} data-state={state}>
      <Link
        href={item.url}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        onClick={onTrackedClick}
        className="panel-onboarding-step__link"
      >
        {body}
      </Link>
    </li>
  );
}

export function OnboardingChecklist({ items }: { items: ChecklistItem[] }) {
  const [sheetItem, setSheetItem] = useState<ChecklistItem | null>(null);
  const pendingIndex = items.findIndex((item) => !item.done);

  function handleDirectOpen() {
    if (!sheetItem?.url?.trim()) return;
    if (CLICK_TRACKED.has(sheetItem.key)) void markOnboardingStepAction(sheetItem.key);
    window.open(sheetItem.url, '_blank', 'noopener,noreferrer');
    setSheetItem(null);
  }

  return (
    <>
      <ul className="panel-onboarding-steps">
        {items.map((item, index) => {
          const isNext = index === pendingIndex;
          const isTracked = CLICK_TRACKED.has(item.key);

          return (
            <StepCard
              key={item.key}
              item={item}
              isNext={isNext}
              onOpenSheet={() => setSheetItem(item)}
              onTrackedClick={isTracked ? () => void markOnboardingStepAction(item.key) : undefined}
            />
          );
        })}
      </ul>

      <PanelAcademyLinkSheet
        open={sheetItem !== null}
        title={sheetItem?.label ?? ''}
        stepKey={sheetItem?.key ?? ''}
        url={sheetItem?.url ?? null}
        onClose={() => setSheetItem(null)}
        onDirectOpen={handleDirectOpen}
      />
    </>
  );
}
