'use client';

import { sanitizeVisitorNameInput } from '@/lib/chatbot/visitor';
import { cn } from '@/lib/utils';

interface ChatbotVisitorIntroProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  compact?: boolean;
}

export function ChatbotVisitorIntro({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  compact = false,
}: ChatbotVisitorIntroProps) {
  return (
    <div className={cn('pb-2.5', compact ? 'text-[11px]' : 'text-[12px]')}>
      <p className="mb-1.5 text-right font-medium text-primary-dark">نام و نام خانوادگی (اختیاری)</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={firstName}
          onChange={(e) => onFirstNameChange(sanitizeVisitorNameInput(e.target.value))}
          placeholder="نام"
          autoComplete="given-name"
          className="rounded border border-border/60 bg-white px-2.5 py-2 text-[12px] outline-none transition focus:border-primary/40"
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => onLastNameChange(sanitizeVisitorNameInput(e.target.value))}
          placeholder="نام خانوادگی"
          autoComplete="family-name"
          className="rounded border border-border/60 bg-white px-2.5 py-2 text-[12px] outline-none transition focus:border-primary/40"
        />
      </div>
    </div>
  );
}
