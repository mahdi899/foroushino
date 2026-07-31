'use client';

import { ExternalLink, ShieldAlert } from 'lucide-react';

export function TelegramBotLaunchButton({
  href,
  label = 'ورود سریع به ربات تلگرام',
  className = 'btn btn-primary w-full',
  isIranIp = false,
}: {
  href: string;
  label?: string;
  className?: string;
  isIranIp?: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      {isIranIp ? (
        <div
          role="alert"
          className="rounded-xl border-2 border-amber-400 bg-amber-100 px-4 py-4 text-center dark:border-amber-500 dark:bg-amber-500/15"
          dir="rtl"
        >
          <p className="flex items-center justify-center gap-2 text-base font-bold text-amber-900 dark:text-amber-300">
            <ShieldAlert size={22} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            فیلترشکن (VPN) را روشن کنید
          </p>
          <p className="mt-1.5 text-sm font-medium leading-6 text-amber-800 dark:text-amber-400/90">
            بدون VPN ربات تلگرام باز نمی‌شود.
          </p>
        </div>
      ) : null}

      <a href={href} target="_blank" rel="noreferrer" className={className}>
        <ExternalLink size={16} />
        {label}
      </a>
    </div>
  );
}
