import { ScrollText, CheckCircle2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { commissionRules } from '@/data/mockExtra'
import { ProductLink } from '@/components/domain/ProductLink'
import { toFa } from '@/lib/format'

export function CommissionRulesScreen() {
  const products = useStore((s) => s.products)

  return (
    <Page withNav={false}>
      <TopBar title="قوانین پورسانت" subtitle="نحوه محاسبه و آزادسازی پورسانت" />

      <div className="space-y-4 px-4">
        <div className="flex items-start gap-2.5 rounded-2xl bg-primary-50 p-4">
          <ScrollText size={18} className="mt-0.5 shrink-0 text-primary-600" />
          <p className="text-[12.5px] font-bold leading-6 text-primary-700">
            پورسانت هر فروش پس از تایید نهایی سوپروایزر محاسبه و به‌صورت معلق در کیف پول ثبت می‌شود. پس از گذشت بازه
            انتظار، مبلغ به‌صورت خودکار قابل برداشت می‌شود.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-[13px] font-extrabold text-neutral-900">نرخ پورسانت محصولات</p>
          </div>
          {products.map((p, i) => (
            <div
              key={p.id}
              className={
                'flex items-center justify-between px-4 py-3.5 ' +
                (i < products.length - 1 ? 'border-b border-border/60' : '')
              }
            >
              <ProductLink
                product={p}
                className="text-[12.5px] font-bold text-neutral-600"
                showChevron
              >
                {p.name}
              </ProductLink>
              <span className="text-[13px] font-black tabular-nums text-primary-600">
                {toFa(p.commissionRate)}٪
              </span>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-[13px] font-extrabold text-neutral-900">قوانین کلی</p>
          </div>
          <div className="divide-y divide-border/60">
            {commissionRules.map((rule) => (
              <div key={rule} className="flex items-start gap-2.5 px-4 py-3.5">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success-500" />
                <p className="text-[12.5px] font-bold leading-6 text-neutral-700">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}
