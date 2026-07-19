'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CheckoutDiscountCodeField } from '@/components/commerce/CheckoutDiscountCodeField';
import { CheckoutReferralCodeField } from '@/components/commerce/CheckoutReferralCodeField';

type PromoTab = 'referral' | 'discount';

type CheckoutPromoCodeFieldsProps = {
  ownReferralCode?: string | null;
  productId: number;
  customerPhone?: string | null;
};

function PromoTabButton({
  label,
  appliedCode,
  active,
  onClick,
}: {
  label: string;
  appliedCode: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={cn(
        'flex min-h-11 flex-1 items-center justify-between gap-2 rounded-tile border px-3 py-2.5 text-sm transition-[border-color,background-color,color,box-shadow] duration-200',
        active
          ? 'border-emerald/35 bg-emerald/10 text-bone shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'border-bone/10 bg-ink/25 text-bone-dim hover:border-bone/18 hover:bg-ink/40 hover:text-bone',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium">{label}</span>
        {appliedCode && !active ? (
          <span className="max-w-[5.5rem] truncate rounded-pill border border-emerald/25 bg-emerald/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-glow num-latin">
            {appliedCode}
          </span>
        ) : null}
      </span>
      <ChevronDown
        size={15}
        className={cn('shrink-0 text-mist transition-transform duration-200', active && 'rotate-180 text-emerald-glow')}
        aria-hidden
      />
    </button>
  );
}

export function CheckoutPromoCodeFields({
  ownReferralCode,
  productId,
  customerPhone,
}: CheckoutPromoCodeFieldsProps) {
  const [activeTab, setActiveTab] = useState<PromoTab | null>(null);
  const [referralMounted, setReferralMounted] = useState(false);
  const [discountMounted, setDiscountMounted] = useState(false);
  const [referralApplied, setReferralApplied] = useState<string | null>(null);
  const [discountApplied, setDiscountApplied] = useState<string | null>(null);

  function toggleTab(tab: PromoTab) {
    if (tab === 'referral') setReferralMounted(true);
    if (tab === 'discount') setDiscountMounted(true);
    setActiveTab((current) => (current === tab ? null : tab));
  }

  return (
    <div className="mt-4 border-t border-bone/10 pt-4">
      <div className="grid grid-cols-2 gap-2">
        <PromoTabButton
          label="کد معرف"
          appliedCode={referralApplied}
          active={activeTab === 'referral'}
          onClick={() => toggleTab('referral')}
        />
        <PromoTabButton
          label="کد تخفیف"
          appliedCode={discountApplied}
          active={activeTab === 'discount'}
          onClick={() => toggleTab('discount')}
        />
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out',
          activeTab ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          {referralMounted ? (
            <div className={activeTab === 'referral' ? undefined : 'hidden'}>
              <CheckoutReferralCodeField
                variant="panel"
                ownReferralCode={ownReferralCode}
                onAppliedChange={setReferralApplied}
              />
            </div>
          ) : null}
          {discountMounted ? (
            <div className={activeTab === 'discount' ? undefined : 'hidden'}>
              <CheckoutDiscountCodeField
                variant="panel"
                productId={productId}
                customerPhone={customerPhone}
                onAppliedChange={setDiscountApplied}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
