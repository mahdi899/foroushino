'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ChatbotPublicConfig } from '@/lib/chatbot/types';
import { ChatbotLauncher } from './ChatbotLauncher';

const FloatingChatbot = dynamic(
  () => import('./FloatingChatbot').then((m) => m.FloatingChatbot),
  { ssr: false },
);

interface ChatbotWidgetClientProps {
  config: ChatbotPublicConfig;
  aiAvailable: boolean;
  lazyLoad?: boolean;
}

export function ChatbotWidgetClient({ config, aiAvailable, lazyLoad = true }: ChatbotWidgetClientProps) {
  const [activated, setActivated] = useState(!lazyLoad);

  const activate = useCallback(() => {
    setActivated(true);
  }, []);

  if (!activated) {
    return <ChatbotLauncher config={config} onActivate={activate} />;
  }

  return <FloatingChatbot config={config} faqGroups={[]} aiAvailable={aiAvailable} lazyLoadFaqs />;
}
