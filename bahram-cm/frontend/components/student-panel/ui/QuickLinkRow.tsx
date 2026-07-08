import type { LucideIcon } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';

export function QuickLinkRow({
  label,
  href,
  icon: Icon,
  tone,
  external = true,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="panel-link-row transition-all duration-300 hover:scale-[1.01]"
    >
      <span className="flex items-center gap-3">
        <span className={`panel-link-row__icon ${tone}`}>
          <Icon size={16} />
        </span>
        {label}
      </span>
      <ChevronLeft size={16} className="text-text-muted" />
    </a>
  );
}
