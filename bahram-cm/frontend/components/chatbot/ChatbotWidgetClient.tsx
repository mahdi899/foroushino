'use client';

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import type { ChatbotPublicConfig } from '@/lib/chatbot/types';
import type { FaqGroup } from '@/lib/data/chatbotFaq';
import { ChatbotLauncher } from './ChatbotLauncher';

type FloatingChatbotType = ComponentType<{
  config: ChatbotPublicConfig;
  faqGroups: FaqGroup[];
  aiAvailable: boolean;
  lazyLoadFaqs?: boolean;
  initialOpen?: boolean;
}>;

interface ChatbotWidgetClientProps {
  config: ChatbotPublicConfig;
  aiAvailable: boolean;
  faqGroups?: FaqGroup[];
  /** When true, mount after window load + idle; when false, mount right after window load. */
  lazyLoad?: boolean;
}

function scheduleAfterPageLoad(run: () => void, lazy: boolean): () => void {
  let cancelled = false;
  let idleId: number | undefined;
  let timerId: number | undefined;

  const start = () => {
    if (cancelled) return;
    if (lazy) {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(
          () => {
            if (!cancelled) run();
          },
          { timeout: 6000 },
        );
      } else {
        timerId = window.setTimeout(() => {
          if (!cancelled) run();
        }, 800);
      }
    } else {
      run();
    }
  };

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
  }

  return () => {
    cancelled = true;
    if (idleId !== undefined && typeof window.requestIdleCallback === 'function') {
      window.cancelIdleCallback(idleId);
    }
    if (timerId !== undefined) window.clearTimeout(timerId);
  };
}

export function ChatbotWidgetClient({
  config,
  aiAvailable,
  faqGroups = [],
  lazyLoad = true,
}: ChatbotWidgetClientProps) {
  const [FloatingWidget, setFloatingWidget] = useState<FloatingChatbotType | null>(null);
  const [openOnMount, setOpenOnMount] = useState(false);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  const loadWidget = useCallback(() => {
    if (loadPromiseRef.current) return loadPromiseRef.current;

    loadPromiseRef.current = import('./FloatingChatbot').then((mod) => {
      setFloatingWidget(() => mod.FloatingChatbot);
    });

    return loadPromiseRef.current;
  }, []);

  const onLauncherActivate = useCallback(() => {
    setOpenOnMount(true);
    void loadWidget();
  }, [loadWidget]);

  useEffect(() => {
    return scheduleAfterPageLoad(() => {
      void loadWidget();
    }, lazyLoad);
  }, [lazyLoad, loadWidget]);

  if (!FloatingWidget) {
    return (
      <ChatbotLauncher
        config={config}
        onActivate={onLauncherActivate}
        loading={openOnMount}
      />
    );
  }

  return (
    <FloatingWidget
      config={config}
      faqGroups={faqGroups}
      aiAvailable={aiAvailable}
      lazyLoadFaqs={faqGroups.length === 0}
      initialOpen={openOnMount}
    />
  );
}
