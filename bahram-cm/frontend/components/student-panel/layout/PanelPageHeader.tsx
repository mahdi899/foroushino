import type { LucideIcon } from 'lucide-react';

export function PanelPageHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <header className="panel-page-header">
      <span className="panel-page-header__icon">
        <Icon size={24} />
      </span>
      <div>
        <h1 className="panel-page-header__title">{title}</h1>
        {description ? <p className="panel-page-header__desc">{description}</p> : null}
      </div>
    </header>
  );
}
