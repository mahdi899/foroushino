'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const selectClass =
  'field-input mt-1 w-full min-w-[7.5rem] max-w-[10rem] py-1.5 text-caption font-normal';

export function OrdersTableHeaderSelect({
  param,
  value,
  placeholder,
  options,
  'aria-label': ariaLabel,
}: {
  param: 'status' | 'payment_status';
  value?: string;
  placeholder: string;
  options: Record<string, string>;
  'aria-label': string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextValue) {
      params.set(param, nextValue);
    } else {
      params.delete(param);
    }
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="block min-w-0">
      <span className="block text-small font-semibold text-text">{placeholder}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
        aria-label={ariaLabel}
      >
        <option value="">همه</option>
        {Object.entries(options).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
