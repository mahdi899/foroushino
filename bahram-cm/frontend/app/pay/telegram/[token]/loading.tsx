import { SiteLoader } from "@/components/layout/SiteLoader";

export default function TelegramPayLoading() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <SiteLoader size="lg" variant="page" label="" ariaLabel="در حال بررسی پرداخت" />
        <p className="text-lg font-medium text-ink">در حال بررسی پرداخت…</p>
        <p className="text-sm text-text-muted">مبلغ و شرایط تخفیف در حال بررسی است…</p>
      </div>
    </main>
  );
}
