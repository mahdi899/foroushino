import type { FamilyActionResults } from '@/lib/family/types';

function withPercents(options: FamilyActionResults['options'], total: number): FamilyActionResults['options'] {
  return options.map((option) => ({
    ...option,
    percent: total > 0 ? Math.round((option.count / total) * 100) : 0,
  }));
}

function countsFromResults(
  results: FamilyActionResults | null | undefined,
): Record<string, number> {
  return Object.fromEntries((results?.options ?? []).map((option) => [option.value, option.count]));
}

/** Keep action option labels/order as source of truth for poll display. */
export function normalizePollResults(
  actionOptions: { value: string; label: string }[],
  results: FamilyActionResults,
): FamilyActionResults {
  if (actionOptions.length === 0) {
    return {
      total: results.total,
      options: withPercents(results.options, results.total),
    };
  }

  const counts = countsFromResults(results);

  const options = actionOptions.map((option) => ({
    value: option.value,
    label: option.label,
    count: counts[option.value] ?? 0,
    percent: 0,
  }));

  return {
    total: results.total,
    options: withPercents(options, results.total),
  };
}

function baseOptionsFromAction(
  actionOptions: { value: string; label: string }[],
  results: FamilyActionResults | null | undefined,
): FamilyActionResults['options'] {
  const counts = countsFromResults(results);

  return actionOptions.map((option) => ({
    value: option.value,
    label: option.label,
    count: counts[option.value] ?? 0,
    percent: 0,
  }));
}

export function applySingleChoiceVote(
  results: FamilyActionResults | null | undefined,
  actionOptions: { value: string; label: string }[],
  value: string,
): FamilyActionResults {
  const baseOptions = baseOptionsFromAction(actionOptions, results);

  const nextOptions = baseOptions.map((option) =>
    option.value === value ? { ...option, count: option.count + 1 } : option,
  );
  const total = (results?.total ?? 0) + 1;

  return normalizePollResults(actionOptions, { total, options: withPercents(nextOptions, total) });
}

export function applyMultiChoiceVote(
  results: FamilyActionResults | null | undefined,
  actionOptions: { value: string; label: string }[],
  values: string[],
): FamilyActionResults {
  const baseOptions = baseOptionsFromAction(actionOptions, results);

  const valueSet = new Set(values);
  const nextOptions = baseOptions.map((option) =>
    valueSet.has(option.value) ? { ...option, count: option.count + 1 } : option,
  );
  const total = (results?.total ?? 0) + 1;

  return normalizePollResults(actionOptions, { total, options: withPercents(nextOptions, total) });
}

export function applyConfirmationVote(
  results: FamilyActionResults | null | undefined,
  confirmed: boolean,
): FamilyActionResults {
  const baseOptions = results?.options ?? [
    { value: 'yes', label: 'انجام دادم', count: 0, percent: 0 },
    { value: 'no', label: 'هنوز نه', count: 0, percent: 0 },
  ];

  const nextOptions = baseOptions.map((option) =>
    (confirmed && option.value === 'yes') || (!confirmed && option.value === 'no')
      ? { ...option, count: option.count + 1 }
      : option,
  );
  const total = (results?.total ?? 0) + 1;

  return { total, options: withPercents(nextOptions, total) };
}
