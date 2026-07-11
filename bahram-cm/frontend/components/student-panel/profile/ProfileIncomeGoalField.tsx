'use client';

import { useEffect, useMemo, useState } from 'react';
import { toPersianDigits } from '@/lib/persian';

function toLatinDigits(input: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return input.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
}

function parseIncomeGoalMillions(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  const match = toLatinDigits(value.trim()).match(/(\d+)/);
  return match ? match[1] : '';
}

export function ProfileIncomeGoalField({
  defaultValue,
  onChange,
}: {
  defaultValue: string | null | undefined;
  onChange?: () => void;
}) {
  const [millions, setMillions] = useState(() => parseIncomeGoalMillions(defaultValue));

  const formattedSubmit = useMemo(() => {
    const amount = Number.parseInt(millions, 10);
    if (!amount || amount <= 0) return '';
    return `${toPersianDigits(amount)} میلیون تومان`;
  }, [millions]);

  function handleChange(raw: string) {
    const latin = toLatinDigits(raw).replace(/\D/g, '');
    setMillions(latin);
  }

  useEffect(() => {
    onChange?.();
  }, [formattedSubmit, onChange]);

  return (
    <div className="panel-profile-field">
      <label className="field-label" htmlFor="income_goal_display">
        هدف درآمدی
      </label>
      <input type="hidden" name="income_goal" value={formattedSubmit} />
      <div className="field-input-wrap field-input-wrap--suffix">
        <input
          id="income_goal_display"
          type="text"
          inputMode="numeric"
          value={millions ? toPersianDigits(millions) : ''}
          onChange={(e) => handleChange(e.target.value)}
          className="field-input"
          placeholder="مثلاً ۵۰"
          dir="ltr"
        />
        <span className="field-input-suffix" aria-hidden>
          میلیون تومان
        </span>
      </div>
    </div>
  );
}
