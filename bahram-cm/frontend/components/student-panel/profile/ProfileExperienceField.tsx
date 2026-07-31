'use client';

import { PanelOptionSheetField } from '@/components/ui/PanelOptionSheetField';

export const EXPERIENCE_LEVEL_OPTIONS = [
  { value: 'مبتدی', label: 'مبتدی' },
  { value: 'متوسط', label: 'متوسط' },
  { value: 'حرفه‌ای', label: 'حرفه‌ای' },
] as const;

export function ProfileExperienceField({
  defaultValue,
  onChange,
}: {
  defaultValue?: string | null;
  onChange?: () => void;
}) {
  const initial = defaultValue?.trim() ?? '';
  const known = EXPERIENCE_LEVEL_OPTIONS.some((o) => o.value === initial);
  const options = known || !initial
    ? [...EXPERIENCE_LEVEL_OPTIONS]
    : [...EXPERIENCE_LEVEL_OPTIONS, { value: initial, label: initial }];

  return (
    <div className="panel-profile-field">
      <label className="field-label" htmlFor="experience_level" id="experience_level-label">
        سطح تجربه
      </label>
      <PanelOptionSheetField
        id="experience_level"
        name="experience_level"
        title="سطح تجربه"
        placeholder="انتخاب کنید"
        defaultValue={initial}
        options={options}
        layout="grid"
        onChange={() => onChange?.()}
      />
    </div>
  );
}
