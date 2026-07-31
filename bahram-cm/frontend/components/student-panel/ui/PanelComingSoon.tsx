import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';

interface PanelComingSoonProps {
  title: string;
  description?: string;
}

export function PanelComingSoon({ title, description }: PanelComingSoonProps) {
  return (
    <div className="panel-page-inner flex flex-col gap-5">
      <div className="card panel-empty-state flex flex-col items-center gap-4 p-8 text-center sm:p-12">
        <span className="panel-feature-card__icon">
          <Clock size={26} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-bold text-text sm:text-xl">{title}</h1>
          <p className="panel-card-text leading-relaxed">{description ?? 'این بخش به‌زودی فعال می‌شود.'}</p>
        </div>
        <Link href="/panel" className="btn btn-primary panel-text-body">
          <ArrowRight size={14} />
          بازگشت به داشبورد
        </Link>
      </div>
    </div>
  );
}
