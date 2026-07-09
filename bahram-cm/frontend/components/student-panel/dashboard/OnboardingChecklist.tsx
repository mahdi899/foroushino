'use client';

import Link from 'next/link';
import {
  BookOpen,
  Bot,
  Briefcase,
  Check,
  Gift,
  MessageCircle,
  Radio,
  User,
  type LucideIcon,
} from 'lucide-react';
import { markOnboardingStepAction } from '@/lib/student/panelActions';

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  url: string | null;
}

const CLICK_TRACKED = new Set(['telegram_channel', 'rubika_channel', 'telegram_bot', 'customer_club']);

const STEP_ICONS: Record<string, LucideIcon> = {
  profile: User,
  telegram_channel: MessageCircle,
  rubika_channel: Radio,
  telegram_bot: Bot,
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
  onTrackedClick,
}: {
  item: ChecklistItem;
  isNext: boolean;
  onTrackedClick?: () => void;
}) {
  const state = item.done ? 'done' : isNext ? 'active' : 'pending';

  const body = (
    <>
      <StepVisual item={item} isNext={isNext} />
      <span
        className={`panel-onboarding-step__label${item.done ? ' panel-onboarding-step__label--done' : ''}`}
      >
        {item.label}
      </span>
    </>
  );

  const className = `panel-onboarding-step panel-onboarding-step--${state}`;

  if (item.done || !item.url) {
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
  const pendingIndex = items.findIndex((item) => !item.done);

  return (
    <ul className="panel-onboarding-steps">
      {items.map((item, index) => {
        const isNext = index === pendingIndex;
        const isTracked = CLICK_TRACKED.has(item.key);

        return (
          <StepCard
            key={item.key}
            item={item}
            isNext={isNext}
            onTrackedClick={isTracked ? () => void markOnboardingStepAction(item.key) : undefined}
          />
        );
      })}
    </ul>
  );
}
