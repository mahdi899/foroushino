'use client';

import { useEffect, useRef } from 'react';
import { usePanelToast } from '@/components/student-panel/ui/PanelToastContext';
import type { SimpleFormState } from '@/lib/student/panelActions';

type Options = {
  successTitle?: string;
  errorTitle?: string;
};

export function usePanelFormFeedback(state: SimpleFormState, options?: Options) {
  const { showToast } = usePanelToast();
  const handled = useRef<SimpleFormState | null>(null);

  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;

    if (state.success) {
      showToast({
        tone: 'success',
        title: options?.successTitle,
        message: state.success,
      });
    }

    if (state.error) {
      showToast({
        tone: 'error',
        title: options?.errorTitle,
        message: state.error,
      });
    }
  }, [options?.errorTitle, options?.successTitle, showToast, state]);
}
