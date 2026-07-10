import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { ClearCartOnPurchase } from "@/components/commerce/ClearCartOnPurchase";
import { PaymentResultPanelButton } from "@/components/commerce/PaymentResultPanelButton";
import { Reveal } from "@/components/motion/Reveal";
import { getVerifiedPaymentResult, type PaymentResultStatus } from "@/lib/checkout/paymentResult";
import { getCurrentStudent } from "@/lib/student/session";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "نتیجه‌ی پرداخت",
  description: "وضعیت پرداخت سفارش شما.",
  path: "/payment/result",
  noIndex: true,
});

const COPY: Record<
  PaymentResultStatus,
  { title: string; body: string; icon: typeof CheckCircle2; tone: string }
> = {
  success: {
    title: "پرداخت با موفقیت انجام شد",
    body: "سفارش شما ثبت شد. اطلاعات دسترسی/پیامک تأییدیه به‌زودی برایت ارسال می‌شود.",
    icon: CheckCircle2,
    tone: "text-emerald-glow",
  },
  failed: {
    title: "پرداخت ناموفق بود",
    body: "متأسفانه پرداخت انجام نشد. می‌توانی دوباره تلاش کنی یا با پشتیبانی تماس بگیری.",
    icon: XCircle,
    tone: "text-gold",
  },
  cancelled: {
    title: "پرداخت لغو شد",
    body: "از درگاه پرداخت برگشتی و تراکنش انجام نشد. سفارش هنوز باز است — هر زمان آماده بودی می‌توانی دوباره پرداخت کنی.",
    icon: Clock,
    tone: "text-mist",
  },
};

function retryHref(product?: string | null): string {
  if (product) return `/purchase/${product}`;
  return "/cart";
}

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const [verified, student] = await Promise.all([
    token ? getVerifiedPaymentResult(token) : Promise.resolve(null),
    getCurrentStudent(),
  ]);

  if (!verified) {
    return (
      <main id="main-content" className="relative min-w-0 max-w-full">
        <section className="py-section">
          <div className="container-luxe flex justify-center">
            <Reveal>
              <div className="neon-surface-static max-w-xl rounded-card border border-bone/10 bg-charcoal/45 p-8 text-center md:p-12">
                <XCircle className="mx-auto h-12 w-12 text-gold" strokeWidth={1.4} aria-hidden />
                <h1 className="mt-6 text-h2 text-balance text-bone">لینک نامعتبر یا منقضی شده</h1>
                <p className="mt-4 text-bone-dim">
                  این صفحه فقط از طریق بازگشت از درگاه پرداخت در دسترس است. اگر تازه پرداخت کرده‌ای، از
                  لینک بازگشت درگاه استفاده کن؛ در غیر این صورت می‌توانی دوباره پرداخت کنی یا وارد پنل
                  شوی.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link
                    href="/cart"
                    className="neon-btn-primary inline-flex h-11 items-center justify-center rounded-pill bg-emerald px-6 font-semibold hover:bg-emerald-glow"
                  >
                    بازگشت به سبد خرید
                  </Link>
                  <Link
                    href="/panel"
                    className="inline-flex h-11 items-center justify-center rounded-pill border border-bone/15 px-6 text-bone hover:border-bone/30"
                  >
                    ورود به پنل
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    );
  }

  const { status, order_number: order, product_slug: product } = verified;
  const copy = COPY[status];
  const Icon = copy.icon;
  const payAgainHref = retryHref(product);

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      {status === "success" ? <ClearCartOnPurchase productSlug={product} /> : null}
      <section className="py-section">
        <div className="container-luxe flex justify-center">
          <Reveal>
            <div className="neon-surface-static max-w-xl rounded-card border border-bone/10 bg-charcoal/45 p-8 text-center md:p-12">
              <Icon className={`mx-auto h-12 w-12 ${copy.tone}`} strokeWidth={1.4} aria-hidden />
              <h1 className="mt-6 text-h2 text-balance text-bone">{copy.title}</h1>
              <p className="mt-4 text-bone-dim">{copy.body}</p>
              {order ? (
                <p className="mt-5 text-caption text-mist">
                  شماره سفارش: <span className="num-latin text-bone">{order}</span>
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                {status === "success" ? (
                  <PaymentResultPanelButton receiptToken={token!} isLoggedIn={Boolean(student)} />
                ) : (
                  <>
                    <Link
                      href={payAgainHref}
                      className="neon-btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-emerald px-6 font-semibold hover:bg-emerald-glow"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      پرداخت مجدد
                    </Link>
                    <Link
                      href="/"
                      className="inline-flex h-11 items-center justify-center rounded-pill border border-bone/15 px-6 text-bone hover:border-bone/30"
                    >
                      بازگشت به خانه
                    </Link>
                  </>
                )}
                {status !== "success" ? (
                  <Link
                    href="mailto:hello@bahramrostami.com"
                    className="inline-flex h-11 items-center justify-center rounded-pill border border-bone/15 px-6 text-bone hover:border-bone/30"
                  >
                    تماس با پشتیبانی
                  </Link>
                ) : null}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
