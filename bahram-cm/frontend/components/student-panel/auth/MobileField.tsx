'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import {
  getIranMobileInputError,
  isValidIranMobile,
  sanitizePhoneInput,
} from '@/lib/chatbot/phone';

type MobileFieldProps = {
  id: string;
  name?: string;
  label?: string;
  autoFocus?: boolean;
  required?: boolean;
  showErrors?: boolean;
  onValidityChange?: (valid: boolean) => void;
};

export function MobileField({
  id,
  name = 'mobile',
  label = 'شماره موبایل',
  autoFocus,
  required = true,
  showErrors = false,
  onValidityChange,
}: MobileFieldProps) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  const error = getIranMobileInputError(value);
  const showError = error !== null && (touched || showErrors || value.length >= 2);
  const valid = isValidIranMobile(value);

  useEffect(() => {
    onValidityChange?.(valid);
  }, [valid, onValidityChange]);

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="09xxxxxxxxx"
        className={cn('field-input', showError && 'field-input--error')}
        required={required}
        dir="ltr"
        autoFocus={autoFocus}
        maxLength={11}
        value={value}
        onChange={(e) => setValue(sanitizePhoneInput(e.target.value))}
        onBlur={() => setTouched(true)}
        aria-invalid={showError}
        aria-describedby={showError ? `${id}-error` : undefined}
      />
      {showError ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
