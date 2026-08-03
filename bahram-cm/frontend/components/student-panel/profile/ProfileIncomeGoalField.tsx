'use client';

import { useEffect, useMemo, useState } from 'react';
import { toLatinDigits, toPersianDigits } from '@/lib/persian';
import { PanelOptionSheetField } from '@/components/ui/PanelOptionSheetField';

const INCOME_OPTIONS = [
  { value: '20', label: `${toPersianDigits(20)} میلیون تومان` },
  { value: '30', label: `${toPersianDigits(30)} میلیون تومان` },
  { value: '40', label: `${toPersianDigits(40)} میلیون تومان` },
  { value: '50', label: `${toPersianDigits(50)} میلیون تومان` },
  { value: '50+', label: `بیشتر از ${toPersianDigits(50)} میلیون تومان` },
];

function parseIncomeGoalValue(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  const text = value.trim();
  if (/بیشتر|بیش از|فوق/.test(text) || /\+/.test(text)) return '50+';
  const match = toLatinDigits(text).match(/(\d+)/);
  if (!match) return '';
  const amount = match[1];
  if (INCOME_OPTIONS.some((o) => o.value === amount)) return amount;
  const n = Number.parseInt(amount, 10);
  if (n > 50) return '50+';
  return amount;
}

function formatIncomeGoal(value: string): string {
  if (!value) return '';
  if (value === '50+') return `بیشتر از ${toPersianDigits(50)} میلیون تومان`;
  const amount = Number.parseInt(value, 10);
  if (!amount || amount <= 0) return '';
  return `${toPersianDigits(amount)} میلیون تومان`;
}

export function ProfileIncomeGoalField({
  defaultValue,
  onChange,
}: {
  defaultValue: string | null | undefined;
  onChange?: () => void;
}) {
  const [selected, setSelected] = useState(() => parseIncomeGoalValue(defaultValue));

  const formattedSubmit = useMemo(() => formatIncomeGoal(selected), [selected]);

  useEffect(() => {
    onChange?.();
  }, [formattedSubmit, onChange]);

  return (
    <div className="panel-profile-field">
      <label className="field-label" htmlFor="income_goal_display" id="income_goal_display-label">
        هدف درآمدی
      </label>
      <input type="hidden" name="income_goal" value={formattedSubmit} />
      <PanelOptionSheetField
        id="income_goal_display"
        title="هدف درآمدی"
        placeholder="انتخاب کنید"
        value={selected}
        options={INCOME_OPTIONS}
        layout="grid"
        onChange={setSelected}
      />
    </div>
  );
}
