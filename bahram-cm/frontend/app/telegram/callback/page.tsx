'use client';

export default function TelegramCallbackPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">بازگشت از پرداخت</h1>
      <p className="text-sm text-white/80">
        نتیجه پرداخت از زرین‌پال فقط پس از Verify بک‌اند معتبر است. برای ادامه به ربات برگردید.
      </p>
      <a className="inline-block rounded bg-emerald-600 px-4 py-2 text-sm" href="https://t.me/">
        بازگشت به ربات
      </a>
    </div>
  );
}
