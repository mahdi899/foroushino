'use client';

import { useEffect, useState } from 'react';
import { TelegramSupportGroupsSection } from '@/components/student-panel/telegram/TelegramSupportGroupsSection';
import { fetchTelegramDestinationsAction } from '@/lib/student/panelActions';
import type { StudentTelegramDestinationsPayload } from '@/lib/student/telegramDestinations';

export function TelegramSupportGroupsLazy({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<StudentTelegramDestinationsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      void fetchTelegramDestinationsAction().then((payload) => {
        if (!cancelled && payload) {
          setData(payload);
        }
      });
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(load, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const timer = setTimeout(load, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return <TelegramSupportGroupsSection data={data} compact={compact} />;
}
