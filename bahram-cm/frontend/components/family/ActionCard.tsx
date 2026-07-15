'use client';

import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  CheckCircle2,
  Gauge,
  Hash,
  MessageSquareText,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { respondToAction } from '@/lib/family/api';
import {
  applyConfirmationVote,
  applyMultiChoiceVote,
  applySingleChoiceVote,
} from '@/lib/family/actionResults';
import { familyMotion } from '@/lib/family/motion';
import { useFamilyActionCelebrate } from '@/lib/family/FamilyActionCelebrateContext';
import type { FamilyAction, FamilyActionResults, FamilyActionType } from '@/lib/family/types';

function actionTypeMeta(type: FamilyActionType): { label: string; Icon: LucideIcon } {
  switch (type) {
    case 'commitment':
      return { label: 'تعهد', Icon: Target };
    case 'confirmation':
      return { label: 'بررسی', Icon: CheckCircle2 };
    case 'single_choice':
    case 'multi_choice':
      return { label: 'نظرسنجی', Icon: BarChart3 };
    case 'short_text':
      return { label: 'سوال', Icon: MessageSquareText };
    case 'number':
      return { label: 'عدد', Icon: Hash };
    case 'scale':
      return { label: 'امتیاز', Icon: Gauge };
    default:
      return { label: 'فعالیت', Icon: Target };
  }
}

function PollParticipation({
  results,
  memberCount,
  isStaff,
  className,
}: {
  results: FamilyActionResults | null | undefined;
  memberCount: number;
  isStaff: boolean;
  className?: string;
}) {
  if (memberCount <= 0) return null;

  const answered = results?.total ?? 0;
  const percent = Math.min(100, Math.round((answered / memberCount) * 100));

  return (
    <span className={cn('family-action-meta', className)}>
      {isStaff
        ? `${answered.toLocaleString('en-US')} از ${memberCount.toLocaleString('en-US')} نفر پاسخ دادند`
        : `${percent.toLocaleString('en-US')}٪ شرکت کردند`}
    </span>
  );
}

function PollResults({
  results,
  memberCount,
  isStaff,
  done = false,
}: {
  results: FamilyActionResults;
  memberCount?: number;
  isStaff?: boolean;
  done?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const topPercent = Math.max(...results.options.map((o) => o.percent), 0);

  return (
    <motion.div
      className={cn('family-action-results', done && 'family-action-results--done')}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={familyMotion.tweenFast}
    >
      <ul className="family-action-poll-list">
        {results.options.map((option, index) => {
          const isLeader = option.percent > 0 && option.percent === topPercent;
          const fillWidth = `${Math.max(option.percent, option.percent > 0 ? 6 : 0)}%`;
          return (
            <motion.li
              key={option.value}
              className="family-action-poll-row"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...familyMotion.tweenFast, delay: index * familyMotion.stagger }}
            >
              <motion.div
                className={cn('family-action-poll-row__fill', isLeader && 'family-action-poll-row__fill--lead')}
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: fillWidth }}
                transition={{ duration: 0.72, ease: familyMotion.tween.ease, delay: index * 0.06 }}
                aria-hidden
              />
              <div className="family-action-poll-row__content">
                <span className="family-action-poll-row__label">{option.label}</span>
                <span className="family-action-poll-row__stat tabular-nums">{option.percent}٪</span>
              </div>
            </motion.li>
          );
        })}
      </ul>
      <div className="family-action-meta family-action-meta--footer">
        {results.total.toLocaleString('fa-IR')} رأی
        {memberCount != null && memberCount > 0 ? (
          <>
            <span className="family-action-meta__dot" aria-hidden>
              ·
            </span>
            <PollParticipation
              results={results}
              memberCount={memberCount}
              isStaff={Boolean(isStaff)}
              className="family-action-meta--inline"
            />
          </>
        ) : null}
      </div>
    </motion.div>
  );
}

function ActionHeader({
  typeLabel,
  Icon,
  prompt,
  hidePrompt,
  meta,
}: {
  typeLabel: string;
  Icon: LucideIcon;
  prompt: string;
  hidePrompt?: boolean;
  meta?: ReactNode;
}) {
  return (
    <div className="family-action-header">
      <div className="family-action-header__top">
        <span className="family-action-kicker">
          <Icon className="h-3 w-3" strokeWidth={2} aria-hidden />
          {typeLabel}
        </span>
        {meta}
      </div>
      {!hidePrompt && prompt ? <p className="family-action-question">{prompt}</p> : null}
    </div>
  );
}

function ActionShell({
  done = false,
  children,
}: {
  done?: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn('family-action-glass', done && 'family-action-glass--done')}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={familyMotion.tweenFast}
    >
      {children}
    </motion.div>
  );
}

function ActionSuccess({ compact = false }: { compact?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn('family-action-success', compact && 'family-action-success--compact')}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={familyMotion.spring}
    >
      <CheckCircle2 className="family-action-success__icon" strokeWidth={2.25} aria-hidden />
      <div className="min-w-0">
        <p className="family-action-success__title">پاسخ شما ثبت شد</p>
        {!compact && (
          <p className="family-action-success__sub">بهرام می‌تواند پاسخت را ببیند</p>
        )}
      </div>
    </motion.div>
  );
}

export function ActionCard({
  action,
  memberCount,
  isStaff = false,
  hidePrompt = false,
}: {
  action: FamilyAction;
  memberCount?: number;
  isStaff?: boolean;
  hidePrompt?: boolean;
}) {
  const [justSubmitted, setJustSubmitted] = useState(false);
  const submitted = Boolean(action.responded) || justSubmitted;
  const [pending, setPending] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [numberValue, setNumberValue] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [scale, setScale] = useState<number | null>(null);
  const [results, setResults] = useState<FamilyActionResults | null | undefined>(action.results);
  const { label: typeLabel, Icon: TypeIcon } = actionTypeMeta(action.type);
  const celebrate = useFamilyActionCelebrate();

  const submit = async (value: Record<string, unknown>, nextResults?: FamilyActionResults) => {
    if (pending || submitted) return;
    setPending(true);
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    try {
      await respondToAction(action.id, value);
      if (nextResults) setResults(nextResults);
      setJustSubmitted(true);
      celebrate({ type: action.type });
    } finally {
      setPending(false);
    }
  };

  const showResults =
    results &&
    (action.type === 'single_choice' || action.type === 'multi_choice' || action.type === 'confirmation');

  const isPollType =
    action.type === 'single_choice' || action.type === 'multi_choice' || action.type === 'confirmation';

  const pollMeta =
    isPollType && memberCount != null && memberCount > 0 && !submitted ? (
      <PollParticipation results={results} memberCount={memberCount} isStaff={isStaff} />
    ) : null;

  if (submitted) {
    return (
      <ActionShell done>
        {!hidePrompt && action.prompt ? (
          <p className="family-action-done-question">{action.prompt}</p>
        ) : null}
        {showResults ? (
          <PollResults
            results={results}
            memberCount={memberCount}
            isStaff={isStaff}
            done
          />
        ) : (
          <ActionSuccess compact />
        )}
      </ActionShell>
    );
  }

  const wrap = (children: React.ReactNode) => (
    <ActionShell>
      <ActionHeader
        typeLabel={typeLabel}
        Icon={TypeIcon}
        prompt={action.prompt}
        hidePrompt={hidePrompt}
        meta={pollMeta}
      />
      <div className="family-action-controls">{children}</div>
    </ActionShell>
  );

  switch (action.type) {
    case 'commitment':
      return wrap(
        <button
          type="button"
          disabled={pending}
          onClick={() => submit({ committed: true })}
          className="family-action-cta"
        >
          متعهد می‌شوم
        </button>,
      );

    case 'confirmation':
      return wrap(
        <div className="family-action-split">
          <button
            type="button"
            disabled={pending}
            onClick={() => submit({ confirmed: true }, applyConfirmationVote(results, true))}
            className="family-action-cta family-action-cta--half"
          >
            انجام دادم
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit({ confirmed: false }, applyConfirmationVote(results, false))}
            className="family-action-cta family-action-cta--half family-action-cta--ghost"
          >
            هنوز نه
          </button>
        </div>,
      );

    case 'number':
      return wrap(
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (numberValue) submit({ option: numberValue });
          }}
          className="family-action-number-form"
        >
          <div className="family-action-number-bar">
            <input
              type="number"
              inputMode="decimal"
              dir="ltr"
              value={numberValue}
              onChange={(e) => setNumberValue(e.target.value)}
              className="family-action-field family-action-field--number"
              placeholder="عدد را وارد کن"
              aria-label="عدد"
            />
            <button
              type="submit"
              disabled={pending || !numberValue}
              className="family-action-number-submit"
            >
              ثبت
            </button>
          </div>
        </form>,
      );

    case 'short_text':
      return wrap(
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (textValue.trim()) submit({ text: textValue.trim() });
          }}
          className="family-action-compose"
        >
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            rows={2}
            maxLength={500}
            className="family-action-field family-action-field--area"
            placeholder="پاسخت را بنویس…"
          />
          <button
            type="submit"
            disabled={pending || !textValue.trim()}
            className="family-action-cta"
          >
            ارسال پاسخ
          </button>
        </form>,
      );

    case 'single_choice':
    case 'multi_choice':
      return wrap(
        <div className="family-action-options">
          {action.options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setSelected((prev) =>
                    action.type === 'single_choice'
                      ? [opt.value]
                      : isSelected
                        ? prev.filter((v) => v !== opt.value)
                        : [...prev, opt.value],
                  );
                }}
                className={cn('family-action-option', isSelected && 'family-action-option--selected')}
              >
                <span className="family-action-option__radio" aria-hidden />
                <span className="family-action-option__label">{opt.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            disabled={pending || selected.length === 0}
            onClick={() => {
              if (action.type === 'single_choice') {
                const value = selected[0];
                submit({ option: value }, applySingleChoiceVote(results, action.options, value));
                return;
              }
              submit({ options: selected }, applyMultiChoiceVote(results, action.options, selected));
            }}
            className="family-action-cta"
          >
            ثبت پاسخ
          </button>
        </div>,
      );

    case 'scale': {
      const min = typeof action.config?.min === 'number' ? action.config.min : 1;
      const max = typeof action.config?.max === 'number' ? action.config.max : 10;
      const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

      return wrap(
        <div className="family-action-scale">
          <div className="family-action-segmented" role="group" aria-label="امتیاز">
            {values.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScale(n)}
                aria-pressed={scale === n}
                className={cn('family-action-segment', scale === n && 'family-action-segment--active')}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={pending || scale === null}
            onClick={() => submit({ score: scale })}
            className="family-action-cta"
          >
            ثبت{scale != null ? ` · ${scale.toLocaleString('fa-IR')}` : ''}
          </button>
        </div>,
      );
    }

    default:
      return null;
  }
}
