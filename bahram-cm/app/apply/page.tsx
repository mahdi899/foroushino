import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  Filter,
  KeyRound,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { ApplyForm } from "@/components/forms/ApplyForm";
import { SocialProofStats } from "@/components/sections/SocialProofStats";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { IconTile } from "@/components/ui/IconTile";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "درخواست ورود به آکادمی",
  description:
    "فرم ارزیابی انتخابی برای ورود به آکادمی؛ نام، شماره تماس، ایمیل و انگیزه‌ات را ثبت کن.",
  path: "/apply",
});

const steps = [
  { icon: Filter, title: "گام ۱ — تکمیل فرم", body: "اطلاعات اولیه و انگیزه." },
  { icon: MessageSquareText, title: "گام ۲ — گفت‌وگوی ارزیابی", body: "تماس کوتاه برای تناسب مسیر." },
  { icon: ShieldCheck, title: "گام ۳ — تایید نهایی", body: "تصمیم دوطرفه؛ بدون فشار." },
  { icon: KeyRound, title: "گام ۴ — ورود به آکادمی", body: "اپ خصوصی، اتاق رشد، منتورها." },
];

const criteria = [
  { icon: Target, title: "هدف روشن", body: "می‌دانی چه می‌سازی و چرا." },
  { icon: Compass, title: "آمادگی اجرا", body: "وقت هفتگی برای تمرین می‌گذاری." },
  { icon: Sparkles, title: "نگاه بلندمدت", body: "میانبر نمی‌خواهی؛ مسیر را جدی می‌گیری." },
];

const faqs = [
  {
    question: "هزینه‌ی درخواست چقدر است؟",
    answer: "فرم رایگان است؛ هزینه‌ی عضویت در صورت تأیید، در تماس گفته می‌شود.",
  },
  {
    question: "چقدر طول می‌کشد تا جواب بگیرم؟",
    answer: "معمولاً تا ۵ روز کاری؛ در بازه‌های شلوغ، ممکن است بیشتر شود.",
  },
  {
    question: "اگر هنوز دوره را نگذرانده‌ام چطور؟",
    answer: "اولویت با دانشجوهای کمپین‌نویسی است؛ می‌توانی همزمان درخواست بدهی.",
  },
];

export default function ApplyPage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      {/* HERO */}
      <section className="border-b border-bone/8 bg-ink py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Badge tone="gold" className="mb-4 md:mb-6">
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
              ورود انتخابی به آکادمی
            </Badge>
          </Reveal>
          <Reveal delay={0.06}>
            <Eyebrow>درخواست ارزیابی</Eyebrow>
          </Reveal>
          <Reveal delay={0.12}>
            <h1 className="mt-5 max-w-full min-w-0 text-h1 text-balance md:mt-6 md:max-w-4xl md:text-display">
              ورود به آکادمی، یک تصمیم دوطرفه است.
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-bone-dim md:mt-7 md:text-lg">
              فقط با کسی کار می‌کنیم که آماده‌ی مسیر است؛ این فرم شروع یک گفت‌وگوی واقعی است.
            </p>
          </Reveal>
        </div>
      </section>

      <SocialProofStats className="pt-section-sm" />

      {/* PROGRESS STEPS */}
      <section className="py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>مسیر ارزیابی</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 max-w-3xl text-h2 text-balance">چهار مرحله، یک تصمیم.</h2>
          </Reveal>

          <ol className="mt-8 grid gap-5 md:mt-12 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.06}>
                <li
                  data-neon-tone={i === 3 ? "gold" : "emerald"}
                  className="neon-surface-static relative h-full rounded-card border border-bone/10 bg-charcoal/45 p-6"
                >
                  <span className="absolute top-6 end-6 num-latin text-h3 text-gold/40">۰{i + 1}</span>
                  <IconTile icon={s.icon} tone={i === 3 ? "gold" : "emerald"} />
                  <h3 className="mt-5 text-h3 text-bone">{s.title}</h3>
                  <p className="mt-3 text-bone-dim">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* CRITERIA */}
      <section className="bg-obsidian py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>سه شرط مهم</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 max-w-3xl text-h2 text-balance">برای کی هست — برای کی نیست.</h2>
          </Reveal>
          <div className="mt-8 grid gap-5 md:mt-12 md:grid-cols-3">
            {criteria.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.07}>
                <FeatureCard icon={c.icon} title={c.title} description={c.body} tone="emerald" />
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.25}>
            <ul className="mt-8 grid gap-3 text-bone-dim md:mt-12 md:grid-cols-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-glow" strokeWidth={1.6} aria-hidden />
                اگر دنبال تبدیل واقعی هستی، اینجا جای توست.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-glow" strokeWidth={1.6} aria-hidden />
                اگر اجرای هفتگی داری، می‌توانیم همراه شویم.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-glow" strokeWidth={1.6} aria-hidden />
                اگر در حوزه‌ات نگاه روشن داری، مسیر آماده است.
              </li>
              <li className="flex items-start gap-2 text-mist">
                <span className="mt-0.5 inline-block h-4 w-4 rounded-full border border-bone/15" />
                اگر دنبال میانبر یا وعده‌ی بزرگ هستی، اینجا جای تو نیست.
              </li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* FORM */}
      <section className="py-section-sm">
        <div className="container-luxe">
          <div className="neon-surface-static mx-auto max-w-3xl rounded-card border border-bone/10 bg-charcoal/55 p-8 md:p-10">
            <Reveal>
              <Eyebrow>فرم درخواست</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-5 text-h2 text-balance">چند دقیقه وقت بگذار.</h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-3 text-bone-dim">فقط برای ارزیابی؛ جای دیگری استفاده نمی‌شود.</p>
            </Reveal>

            <ApplyForm />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>پرسش‌های رایج</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 max-w-3xl text-h2 text-balance">سوالات کوتاه قبل از تصمیم.</h2>
          </Reveal>
          <div className="mt-8 md:mt-12">
            <Reveal>
              <Accordion items={faqs} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-section">
        <div className="container-luxe">
          <div className="neon-surface-static rounded-card border border-bone/10 bg-charcoal/40 p-6 text-center sm:p-8 md:p-14">
            <p className="text-caption uppercase tracking-[0.25em] text-gold">یا اگر هنوز مطمئن نیستی</p>
            <h2 className="mt-4 text-h2 text-balance">از کمپین‌نویسی شروع کن.</h2>
            <p className="mt-4 text-bone-dim">اول از کمپین‌نویسی.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <LinkButton href="/course/campaign-writing" variant="sales" size="lg" withArrow>
                مسیر کمپین‌نویسی
              </LinkButton>
              <Link
                href="/founder"
                className="inline-flex items-center gap-2 text-gold transition-colors hover:text-gold-soft"
              >
                درباره‌ی بهرام
                <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
