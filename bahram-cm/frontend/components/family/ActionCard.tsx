'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { respondToAction } from '@/lib/family/api';
import {
  applyConfirmationVote,
  applyMultiChoiceVote,
  applySingleChoiceVote,
} from '@/lib/family/actionResults';
import type { FamilyAction, FamilyActionResults } from '@/lib/family/types';

function PollParticipation({
  results,
  memberCount,
  isStaff,
}: {
  results: FamilyActionResults | null | undefined;
  memberCount: number;
  isStaff: boolean;
}) {
  if (memberCount <= 0) return null;

  const answered = results?.total ?? 0;
  const percent = Math.min(100, Math.round((answered / memberCount) * 100));

  return (
    <p className="text-[11px] tabular-nums text-bone/50">
      {isStaff
        ? `${answered.toLocaleString('en-US')} از ${memberCount.toLocaleString('en-US')} نفر پاسخ دادند`
        : `${percent.toLocaleString('en-US')}٪ شرکت کردند`}
    </p>
  );
}

function PollResults({
  results,
  memberCount,
  isStaff,
}: {
  results: FamilyActionResults;
  memberCount?: number;
  isStaff?: boolean;
}) {
  return (
    <div className="space-y-2.5 border-t border-[var(--family-border-subtle)] pt-3">
      {memberCount != null && memberCount > 0 && (
        <PollParticipation results={results} memberCount={memberCount} isStaff={Boolean(isStaff)} />
      )}
      {results.options.map((option) => (
        <div key={option.value} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-bone/85">{option.label}</span>
            <span className="shrink-0 tabular-nums text-bone/50">
              {option.percent}٪ · {option.count} رأی
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--family-surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--family-accent)] transition-[width] duration-500 ease-out"
              style={{ width: `${option.percent}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-[11px] text-bone/45">{results.total} رأی ثبت‌شده</p>
    </div>
  );
}

export function ActionCard({
  action,
  memberCount,
  isStaff = false,
}: {
  action: FamilyAction;
  memberCount?: number;
  isStaff?: boolean;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [numberValue, setNumberValue] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [scale, setScale] = useState<number | null>(null);
  const [results, setResults] = useState<FamilyActionResults | null | undefined>(action.results);

  const submit = async (value: Record<string, unknown>, nextResults?: FamilyActionResults) => {
    if (pending || submitted) return;
    setPending(true);
    try {
      await respondToAction(action.id, value);
      if (nextResults) setResults(nextResults);
      setSubmitted(true);
    } finally {
      setPending(false);
    }
  };

  const showResults =
    results &&
    (action.type === 'single_choice' || action.type === 'multi_choice' || action.type === 'confirmation');

  const isPollType =
    action.type === 'single_choice' || action.type === 'multi_choice' || action.type === 'confirmation';

  const pollParticipation =
    isPollType && memberCount != null && memberCount > 0 ? (
      <PollParticipation results={results} memberCount={memberCount} isStaff={isStaff} />
    ) : null;

  if (submitted) {
    return (
      <div className="family-action-panel space-y-3 border-[color-mix(in_oklab,var(--family-accent)_30%,var(--family-border))] bg-[color-mix(in_oklab,var(--family-accent)_8%,var(--family-surface-soft))]">
        <p className="text-sm text-[var(--family-accent)]">ثبت شد — داداش بهرام می‌بیندش. ✅</p>
        {showResults && (
          <PollResults results={results} memberCount={memberCount} isStaff={isStaff} />
        )}
      </div>
    );
  }

  const wrap = (children: React.ReactNode) => (
    <div className="family-action-panel space-y-3">
      <p className="text-sm font-medium text-bone">{action.prompt}</p>
      {pollParticipation}
      {children}
    </div>
  );

  switch (action.type) {
    case 'commitment':
      return wrap(
        <button
          type="button"
          disabled={pending}
          onClick={() => submit({ committed: true })}
          className="family-btn-primary w-full rounded-xl py-2.5 text-sm disabled:opacity-60"
        >
          متعهد می‌شوم 💪
        </button>,
      );

    case 'confirmation':
      return wrap(
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                submit({ confirmed: true }, applyConfirmationVote(results, true))
              }
              className="family-btn-primary flex-1 rounded-xl py-2.5 text-sm disabled:opacity-60"
            >
              انجام دادم ✅
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                submit({ confirmed: false }, applyConfirmationVote(results, false))
              }
              className="family-input flex-1 rounded-xl py-2.5 text-sm font-semibold text-bone/70 transition active:scale-[0.98] disabled:opacity-60"
            >
              هنوز نه
            </button>
          </div>
        </div>,
      );

    case 'number':
      return wrap(
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (numberValue) submit({ option: numberValue });
          }}
          className="flex gap-2"
        >
          <input
            type="number"
            inputMode="decimal"
            value={numberValue}
            onChange={(e) => setNumberValue(e.target.value)}
            className="family-input w-[7.5rem] max-w-[38%] shrink-0 rounded-xl px-3 py-2 text-sm sm:w-28"
            placeholder="عدد را وارد کن"
          />
          <button
            type="submit"
            disabled={pending || !numberValue}
            className="family-btn-primary min-w-0 flex-1 rounded-xl px-4 py-2 text-sm disabled:opacity-60"
          >
            ثبت
          </button>
        </form>,
      );

    case 'short_text':
      return wrap(
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (textValue.trim()) submit({ text: textValue.trim() });
          }}
          className="space-y-2"
        >
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            rows={2}
            maxLength={500}
            className="family-input w-full resize-none rounded-xl px-3 py-2 text-sm"
            placeholder="پاسخت رو بنویس…"
          />
          <button
            type="submit"
            disabled={pending || !textValue.trim()}
            className="family-btn-primary w-full rounded-xl px-4 py-2.5 text-sm disabled:opacity-60"
          >
            ثبت پاسخ
          </button>
        </form>,
      );

    case 'single_choice':
    case 'multi_choice':
      return wrap(
        <div className="space-y-2">
          {action.options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setSelected((prev) =>
                    action.type === 'single_choice'
                      ? [opt.value]
                      : isSelected
                        ? prev.filter((v) => v !== opt.value)
                        : [...prev, opt.value],
                  )
                }
                className={cn(
                  'block w-full rounded-xl border px-3 py-2 text-right text-sm transition',
                  isSelected
                    ? 'border-[color-mix(in_oklab,var(--family-accent)_45%,var(--family-border))] bg-[color-mix(in_oklab,var(--family-accent)_10%,var(--family-surface-soft))] text-[var(--family-accent)]'
                    : 'family-input text-bone/80 hover:bg-[var(--family-input-bg)]',
                )}
              >
                {opt.label}
              </button>
            );
          })}
          <button
            type="button"
            disabled={pending || selected.length === 0}
            onClick={() => {
              if (action.type === 'single_choice') {
                const value = selected[0];
                submit(
                  { option: value },
                  applySingleChoiceVote(results, action.options, value),
                );
                return;
              }
              submit(
                { options: selected },
                applyMultiChoiceVote(results, action.options, selected),
              );
            }}
            className="family-btn-primary w-full rounded-xl py-2.5 text-sm disabled:opacity-60"
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
        <div className="space-y-3">
          <div className="flex justify-between gap-1">
            {values.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScale(n)}
                className={cn(
                  'h-8 flex-1 rounded-lg text-xs font-semibold transition',
                  scale === n ? 'family-btn-primary' : 'bg-[var(--family-surface-muted)] text-bone/60',
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={pending || scale === null}
            onClick={() => submit({ score: scale })}
            className="family-btn-primary w-full rounded-xl py-2.5 text-sm disabled:opacity-60"
          >
            ثبت
          </button>
        </div>,
      );
    }

    default:
      return null;
  }
}
