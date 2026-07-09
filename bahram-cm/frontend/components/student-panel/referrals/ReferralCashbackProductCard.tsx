import { Percent, Sparkles } from 'lucide-react';
import { PanelTomanAmount } from '@/components/student-panel/ui/PanelTomanAmount';

export function ReferralCashbackProductCard({
  title,
  type,
  value,
}: {
  title: string;
  type: string;
  value: number;
}) {
  const isPercent = type === 'percent' && value > 0;

  return (
    <li className="panel-referral-product">
      <span className="panel-referral-product__icon" aria-hidden>
        {isPercent ? <Percent size={16} strokeWidth={2} /> : <Sparkles size={16} strokeWidth={2} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="panel-referral-product__title">{title}</p>
        <div className="panel-referral-product__reward">
          {isPercent ? (
            <>
              <span className="text-sm font-bold text-text">{value.toLocaleString('fa-IR')}</span>
              <span className="panel-text-caption font-normal text-text-muted">٪ کش‌بک</span>
            </>
          ) : value > 0 ? (
            <PanelTomanAmount amount={value} size="sm" />
          ) : (
            <span className="panel-text-meta text-text-muted">—</span>
          )}
        </div>
      </div>
    </li>
  );
}
