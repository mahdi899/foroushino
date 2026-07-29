'use client';

import { useMemo } from 'react';
import { sanitizeVisitorNameInput } from '@/lib/chatbot/visitor';
import { chatbotThemeClasses } from '@/lib/chatbot/themeClasses';
import { useDataTheme } from '@/lib/useDataTheme';
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
  const theme = useDataTheme();
  const chatTheme = useMemo(() => chatbotThemeClasses(theme), [theme]);

  return (
    <div className={cn('pb-2.5', compact ? 'text-[11px]' : 'text-[12px]')}>
      <p className={cn('mb-1.5 text-right font-medium', chatTheme.body)}>نام و نام خانوادگی (اختیاری)</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={firstName}
          onChange={(e) => onFirstNameChange(sanitizeVisitorNameInput(e.target.value))}
          placeholder="نام"
          autoComplete="given-name"
          className={cn(
            'rounded-lg px-2.5 py-2 text-[12px] text-bone outline-none transition focus:border-emerald/40',
            chatTheme.composerInput,
            chatTheme.composerPlaceholder,
          )}
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => onLastNameChange(sanitizeVisitorNameInput(e.target.value))}
          placeholder="نام خانوادگی"
          autoComplete="family-name"
          className={cn(
            'rounded-lg px-2.5 py-2 text-[12px] text-bone outline-none transition focus:border-emerald/40',
            chatTheme.composerInput,
            chatTheme.composerPlaceholder,
          )}
        />
      </div>
    </div>
  );
}
