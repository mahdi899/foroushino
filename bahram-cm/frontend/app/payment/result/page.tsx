import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "نتیجه‌ی پرداخت",
  description: "وضعیت پرداخت سفارش شما.",
  path: "/payment/result",
  noIndex: true,
});

type Status = "success" | "failed" | "cancelled";

const COPY: Record<Status, { title: string; body: string; icon: typeof CheckCircle2; tone: string }> = {
  success: {
    title: "پرداخت با موفقیت انجام شد",
    body: "سفارش شما ثبت شد. اطلاعات دسترسی/پیامک تأییدیه به‌زودی برایت ارسال می‌شود.",
    icon: CheckCircle2,
    tone: "text-emerald-glow",
  },
  failed: {
    title: "پرداخت ناموفق بود",
    body: "متاسفانه پرداخت انجام نشد. می‌توانی دوباره تلاش کنی یا با پشتیبانی تماس بگیری.",
    icon: XCircle,
    tone: "text-gold",
  },
  cancelled: {
    title: "پرداخت لغو شد",
    body: "فرایند پرداخت را لغو کردی. هر زمان آماده بودی می‌توانی دوباره اقدام کنی.",
    icon: Clock,
    tone: "text-mist",
  },
};

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; order?: string }>;
}) {
  const { status: rawStatus, order } = await searchParams;
  const status: Status =
    rawStatus === "success" || rawStatus === "failed" || rawStatus === "cancelled"
      ? rawStatus
      : "failed";

  const copy = COPY[status];
  const Icon = copy.icon;

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
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
                  <Link
                    href="/panel"
                    className="neon-btn-primary inline-flex h-11 items-center justify-center rounded-pill bg-emerald px-6 font-semibold hover:bg-emerald-glow"
                  >
                    ورود به پنل کاربری
                  </Link>
                ) : (
                  <Link
                    href="/"
                    className="neon-btn-primary inline-flex h-11 items-center justify-center rounded-pill bg-emerald px-6 font-semibold hover:bg-emerald-glow"
                  >
                    بازگشت به خانه
                  </Link>
                )}
                {status !== "success" ? (
                  <Link
                    href="/apply"
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
