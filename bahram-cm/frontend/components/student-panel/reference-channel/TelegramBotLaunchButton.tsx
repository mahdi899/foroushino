'use client';

import { ExternalLink, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

const TRACE_ENDPOINTS = ['/cdn-cgi/trace', 'https://www.cloudflare.com/cdn-cgi/trace'];

function parseTraceLocation(body: string): string | null {
  for (const line of body.split('\n')) {
    const [key, value] = line.split('=');
    if (key?.trim() === 'loc' && value) return value.trim().toUpperCase();
  }
  return null;
}

async function detectIranIp(signal: AbortSignal): Promise<boolean> {
  for (const endpoint of TRACE_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { signal, cache: 'no-store' });
      if (!response.ok) continue;
      const loc = parseTraceLocation(await response.text());
      if (loc) return loc === 'IR';
    } catch {
      // try next endpoint
    }
  }
  return false;
}

export function TelegramBotLaunchButton({
  href,
  label = 'ورود سریع به ربات تلگرام',
  className = 'btn btn-primary w-full',
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const [isIranIp, setIsIranIp] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void detectIranIp(controller.signal).then((iran) => {
      if (!controller.signal.aborted) setIsIranIp(iran);
    });
    return () => controller.abort();
  }, []);

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
