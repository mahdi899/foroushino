import { getPublicChatbotConfig } from '@/lib/chatbot/public';
import { ChatbotWidgetClient } from './ChatbotWidgetClient';

export async function ChatbotWidget({ lazyLoad = true }: { lazyLoad?: boolean }) {
  const config = await getPublicChatbotConfig();
  if (!config.enabled) return null;

  const aiAvailable = config.enabled && (config.ai_available ?? false);
  return <ChatbotWidgetClient config={config} aiAvailable={aiAvailable} lazyLoad={lazyLoad} />;
}
