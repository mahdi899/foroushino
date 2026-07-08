import { Bot, MessageCircle, Send } from 'lucide-react';
import { QuickLinkRow } from '@/components/student-panel/ui/QuickLinkRow';

const RESOURCE_LINKS = [
  { label: 'کانال تلگرام دوره', href: 'https://t.me/', icon: Send, tone: 'bg-primary/10 text-primary' },
  { label: 'کانال روبیکا دوره', href: 'https://rubika.ir/', icon: MessageCircle, tone: 'bg-gold/10 text-gold' },
  { label: 'ربات تلگرام دوره', href: 'https://t.me/', icon: Bot, tone: 'bg-green-500/10 text-green-400' },
] as const;

export function QuickResourceLinks() {
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-base font-bold text-text">لینک‌های سریع و منابع</h2>
      <div className="flex flex-col gap-2">
        {RESOURCE_LINKS.map((link) => (
          <QuickLinkRow key={link.label} {...link} />
        ))}
      </div>
    </div>
  );
}
