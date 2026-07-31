'use client';

import { toPersianDigits } from '@/lib/persian';
import { PanelOptionSheetField } from '@/components/ui/PanelOptionSheetField';

const PROFILE_AGE_MIN = 12;
const PROFILE_AGE_MAX = 100;

const AGE_OPTIONS = Array.from({ length: PROFILE_AGE_MAX - PROFILE_AGE_MIN + 1 }, (_, i) => {
  const age = PROFILE_AGE_MIN + i;
  return { value: String(age), label: toPersianDigits(age) };
});

export function ProfileAgeField({
  defaultValue,
  onChange,
}: {
  defaultValue?: number | null;
  onChange?: () => void;
}) {
  const initial =
    defaultValue && defaultValue >= PROFILE_AGE_MIN && defaultValue <= PROFILE_AGE_MAX
      ? String(defaultValue)
      : '';

  return (
    <div className="panel-profile-field">
      <label className="field-label" htmlFor="age" id="age-label">
        سن
      </label>
      <PanelOptionSheetField
        id="age"
        name="age"
        title="سن"
        placeholder="انتخاب سن"
        defaultValue={initial}
        options={AGE_OPTIONS}
        onChange={() => onChange?.()}
      />
    </div>
  );
}
