import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BookOpenCheck,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Compass,
  Eye,
  FileText,
  Headphones,
  Layers,
  LineChart,
  Megaphone,
  MessageCircle,
  Mic2,
  Quote,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { CampaignWritingTestimonials } from "@/components/sections/CampaignWritingTestimonials";
import { Accordion } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { IconLabel } from "@/components/ui/IconLabel";
import { IconTile } from "@/components/ui/IconTile";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { pageHeroBackdropPhoto, sitePhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "کمپین‌نویسی · دوره پرچم‌دار",
  description: "۱۰ فصل ساختاری؛ از محتوا تا کمپین. ورود به آکادمی جدا و انتخابی.",
  path: "/course/campaign-writing",
});

const chapters = [
  { id: "ch1", n: "۰۱", title: "نگاه حرفه‌ای", body: "زاویه دید و تمایز اولیه‌ی برند." },
  { id: "ch2", n: "۰۲", title: "پیام مرکزی", body: "ایده به پیام روشن و تکرارپذیر." },
  { id: "ch3", n: "۰۳", title: "روایت بازار", body: "شنونده، بافت فرهنگی، رقبا." },
  { id: "ch4", n: "۰۴", title: "معماری کمپین", body: "روایت در زمان؛ اوج و سکوت." },
  { id: "ch5", n: "۰۵", title: "تولید محتوا", body: "قطعات کمپین؛ نوشتار، تصویر، صدا." },
  { id: "ch6", n: "۰۶", title: "پیشنهاد فروش", body: "از کمپین به پیشنهاد شفاف." },
  { id: "ch7", n: "۰۷", title: "معماری اعتماد", body: "لایه‌های اعتماد در طول مسیر." },
  { id: "ch8", n: "۰۸", title: "اجرا و پخش", body: "زمان‌بندی، کانال‌ها، ریتم." },
  { id: "ch9", n: "۰۹", title: "اندازه‌گیری و بازخورد", body: "شاخص‌های واقعی؛ فراتر از لایک." },
  { id: "ch10", n: "۱۰", title: "تبدیل به سیستم", body: "از یک کمپین موفق به سیستم رشد." },
];

const whoFor = [
  { icon: Briefcase, title: "صاحبان حرفه و کسب‌وکار", body: "محصول دارند؛ روایت متمایز می‌خواهند." },
  { icon: Mic2, title: "مشاوران و مربی‌ها", body: "می‌خواهند مرجع حوزه‌شان شوند." },
  { icon: Megaphone, title: "خالقان محتوا", body: "از پراکندگی به کمپین حرفه‌ای." },
  { icon: Users, title: "تیم‌های مارکتینگ", body: "چارچوب مشترک برای طراحی کمپین." },
];

const youGet = [
  { icon: Video, title: "۱۰ فصل ویدیویی", body: "۴۰+ ساعت؛ ضبط استودیویی." },
  { icon: BookOpenCheck, title: "تمرین‌های اجرا", body: "هر فصل، خروجی عملی." },
  { icon: FileText, title: "قالب‌ها و چک‌لیست‌ها", body: "برای طراحی، اجرا، ارزیابی." },
  { icon: LineChart, title: "نقشه‌ی پیشرفت", body: "پیگیری مسیر و اجرا." },
  { icon: MessageCircle, title: "انجمن خصوصی دانشجوها", body: "بازخورد از هم‌مسیرها." },
  { icon: Award, title: "گواهی پایان مسیر", body: "قدم برای ارزیابی آکادمی." },
];

const stats = [
  { icon: Users, value: "۵۰٬۰۰۰+", label: "دانشجو در مسیر" },
  { icon: Star, value: "۴٫۸ / ۵", label: "میانگین رضایت" },
  { icon: CalendarClock, value: "۴۰+ ساعت", label: "محتوای ساختاری" },
  { icon: Trophy, value: "۱۰ فصل", label: "مسیر فصل‌بندی‌شده" },
];

const faqs = [
  {
    question: "آیا این دوره پیش‌نیاز دارد؟",
    answer: "نه؛ از نگاه و پیام شروع می‌کنیم. پیشینه‌ی محتوا یا فروش کمک می‌کند.",
  },
  {
    question: "خروجی نهایی دوره چیست؟",
    answer: "طرح کمپین اجرایی؛ پیام، نقشه محتوا، پیشنهاد، شاخص‌ها.",
  },
  {
    question: "تفاوت با دوره‌های محتوا چیست؟",
    answer: "تمرکز روی کمپین است نه پست تکی؛ روایت بلندمدت و اعتماد.",
  },
  {
    question: "آیا بعد از دوره وارد آکادمی می‌شوم؟",
    answer: "نه خودکار؛ ورود با ارزیابی و تناسب دوطرفه.",
  },
  {
    question: "ضمانت بازگشت وجه دارد؟",
    answer: "بله؛ طبق سیاست رسمی در همان بازه‌ی ابتدایی.",
  },
];

export default function CourseCampaignWritingPage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div aria-hidden className="absolute inset-0">
          <Image src={pageHeroBackdropPhoto} alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/75 to-ink" />
        </div>
        <div className="container-luxe relative z-[2] min-w-0 py-section-sm md:py-section">
          <div className="grid min-w-0 items-center gap-6 md:grid-cols-12 md:gap-10 lg:gap-12">
            <div className="min-w-0 text-center md:col-span-7 md:text-start">
              <Reveal>
                <Badge
                  tone="gold"
                  className="mb-1.5 gap-1.5 px-2.5 py-0.5 text-[0.65rem] leading-tight md:mb-6 md:gap-2 md:px-3 md:py-1 md:text-caption"
                >
                  <Sparkles className="h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" strokeWidth={1.6} aria-hidden />
                  دوره پرچم‌دار · کمپین‌نویسی
                </Badge>
              </Reveal>
              <div className="flex justify-center md:justify-start">
                <Reveal delay={0.06}>
                  <Eyebrow>اولین در</Eyebrow>
                </Reveal>
              </div>
              <Reveal delay={0.12}>
                <h1 className="mt-3 max-w-full min-w-0 text-h1 text-balance md:mt-6 md:text-display">
                  از تولیدکننده‌ی محتوا،
                  <br />
                  به معمارِ کمپین.
                </h1>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-4 max-w-2xl text-[0.9rem] leading-relaxed text-bone-dim md:mt-7 md:text-base md:text-lg">
                  ۱۰ فصل، تمرین اجرا، نقشه پیشرفت؛ گام اول قبل از آکادمی.
                </p>
              </Reveal>
              <Reveal delay={0.28}>
                <div className="mx-auto mt-6 flex w-full max-w-md flex-col gap-2.5 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 md:mt-10 md:mx-0">
                  <LinkButton
                    href="#enroll"
                    variant="sales"
                    size="lg"
                    withArrow
                    className={cn("w-full min-w-0 sm:w-auto", "max-lg:h-11 max-lg:min-h-11 max-lg:text-[0.9rem]")}
                  >
                    ثبت‌نام در دوره
                  </LinkButton>
                  <LinkButton
                    href="#curriculum"
                    variant="ghost"
                    size="lg"
                    className={cn("w-full min-w-0 sm:w-auto", "max-lg:h-11 max-lg:min-h-11 max-lg:text-[0.9rem]")}
                  >
                    دیدنِ سرفصل‌ها
                  </LinkButton>
                </div>
              </Reveal>
              <Reveal delay={0.36}>
                <div
                  className={cn(
                    "mx-auto mt-6 flex max-w-full flex-nowrap items-center gap-x-3 overflow-x-auto border-t border-bone/8 pt-4 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:mt-10 md:flex-wrap md:gap-x-7 md:overflow-visible md:pt-6",
                    "[&::-webkit-scrollbar]:hidden",
                  )}
                >
                  <IconLabel
                    icon={Video}
                    tone="emerald"
                    className="shrink-0 text-[0.78rem] md:text-[0.95rem] [&_svg]:h-3.5 [&_svg]:w-3.5 md:[&_svg]:h-4 md:[&_svg]:w-4"
                  >
                    ۴۰+ ساعت ویدیو
                  </IconLabel>
                  <span className="hidden shrink-0 text-bone/20 md:inline" aria-hidden>
                    ·
                  </span>
                  <IconLabel
                    icon={Users}
                    tone="bone"
                    className="shrink-0 text-[0.78rem] md:text-[0.95rem] [&_svg]:h-3.5 [&_svg]:w-3.5 md:[&_svg]:h-4 md:[&_svg]:w-4"
                  >
                    ۵۰٬۰۰۰+ دانشجو
                  </IconLabel>
                  <span className="hidden shrink-0 text-bone/20 md:inline" aria-hidden>
                    ·
                  </span>
                  <IconLabel
                    icon={Award}
                    tone="gold"
                    className="shrink-0 text-[0.78rem] md:text-[0.95rem] [&_svg]:h-3.5 [&_svg]:w-3.5 md:[&_svg]:h-4 md:[&_svg]:w-4"
                  >
                    گواهی پایان مسیر
                  </IconLabel>
                </div>
              </Reveal>
            </div>

            <div className="min-w-0 md:col-span-5">
              <Reveal delay={0.2}>
                <div className="relative mx-auto w-full max-w-[min(100%,22rem)] md:mx-0 md:max-w-none">
                  <div
                    aria-hidden
                    className="absolute -inset-6 -z-[1] rounded-card-lg bg-emerald-deep/40 blur-3xl md:-inset-8"
                  />
                  <div className="neon-surface-framed overflow-hidden rounded-card-lg border border-bone/12 bg-charcoal/40">
                    <Image
                      src={sitePhotos.manifestoLandscape}
                      alt="پیش‌نمایش دوره"
                      width={900}
                      height={700}
                      sizes="(max-width: 768px) min(100vw - 2rem, 22rem), (max-width: 1024px) 40vw, 33vw"
                      className="h-auto w-full"
                    />
                  </div>
                  <span className="absolute -start-2 top-4 rounded-pill border border-gold/30 bg-charcoal/80 px-2.5 py-0.5 text-[0.65rem] text-gold backdrop-blur md:-start-3 md:top-6 md:px-3 md:py-1 md:text-caption">
                    Premium · ۱۰ فصل
                  </span>
                  <div className="absolute -end-5 -bottom-6 hidden w-36 rotate-[5deg] md:block">
                    <PhotoFrame
                      ratio="square"
                      variant="grid"
                      rounded="card"
                      label="پشت صحنه"
                      showIcon={false}
                      src={sitePhotos.courseBackstage}
                      alt="پشت صحنه‌ی دوره"
                    />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-obsidian py-6 md:py-12">
        <div className="container-luxe grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-4 lg:gap-3">
          {stats.map((s) => (
            <Reveal key={s.label}>
              <div className="neon-surface-static flex items-center gap-2.5 rounded-card border border-bone/10 bg-charcoal/45 p-3 min-[400px]:gap-3 min-[400px]:p-4 min-[480px]:gap-4 min-[480px]:p-5">
                <IconTile icon={s.icon} tone="emerald" size="sm" />
                <div className="min-w-0">
                  <p className="text-[0.95rem] font-semibold leading-tight text-bone min-[480px]:text-base min-[520px]:text-h3">{s.value}</p>
                  <p className="text-[0.68rem] leading-snug text-mist min-[480px]:text-caption">{s.label}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* WHO IS THIS FOR */}
      <section className="py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>این دوره برای کیست</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">برای کسی که پشت پیامش می‌ایستد.</h2>
          </Reveal>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 md:mt-10 lg:grid-cols-4">
            {whoFor.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.06}>
                <FeatureCard
                  icon={item.icon}
                  title={item.title}
                  description={item.body}
                  tone={i % 2 === 0 ? "emerald" : "gold"}
                  className="p-4 sm:p-6"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CURRICULUM TABS */}
      <section id="curriculum" className="bg-obsidian py-section-sm md:py-section">
        <div className="container-luxe min-w-0">
          <Reveal>
            <Eyebrow>سرفصل کامل دوره</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">
              ده فصل، یک مسیر منسجم.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-4 max-w-2xl text-[0.9rem] text-bone-dim md:mt-5 md:text-base">
              برای اجرا طراحی شده — نه تماشا.
            </p>
          </Reveal>

          <div className="mt-6 md:mt-12">
            <Tabs
              tabs={[
                {
                  id: "vision",
                  label: "بخش ۱ · نگاه",
                  shortLabel: "نگاه",
                  content: (
                    <CurriculumGroup
                      icon={Eye}
                      title="پایه‌گذاری نگاه و پیام"
                      chapters={chapters.slice(0, 3)}
                    />
                  ),
                },
                {
                  id: "design",
                  label: "بخش ۲ · طراحی",
                  shortLabel: "طراحی",
                  content: (
                    <CurriculumGroup
                      icon={Layers}
                      title="معماری کمپین و پیشنهاد"
                      chapters={chapters.slice(3, 7)}
                    />
                  ),
                },
                {
                  id: "execute",
                  label: "بخش ۳ · اجرا",
                  shortLabel: "اجرا",
                  content: (
                    <CurriculumGroup
                      icon={Target}
                      title="اجرا، اندازه‌گیری و سیستم‌سازی"
                      chapters={chapters.slice(7)}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>چه چیز در اختیار توست</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">ویدیو + ابزار اجرا.</h2>
          </Reveal>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 md:mt-10 lg:grid-cols-3">
            {youGet.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05}>
                <FeatureCard
                  icon={item.icon}
                  title={item.title}
                  description={item.body}
                  tone={i === 5 ? "gold" : "emerald"}
                  className="p-4 sm:p-6"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* INSTRUCTOR */}
      <section className="py-section-sm">
        <div className="container-luxe">
          <div className="neon-surface-static grid grid-cols-1 gap-5 rounded-card border border-bone/10 bg-charcoal/45 p-5 max-[639px]:grid-cols-[108px_minmax(0,1fr)] max-[639px]:items-start md:grid-cols-12 md:gap-10 md:p-10">
            <div className="md:col-span-4">
              <Reveal>
                <PhotoFrame
                  ratio="portrait"
                  variant="radial"
                  rounded="card"
                  badge="پرتره‌ی رسمی"
                  label="بهرام رستمی"
                  className="border-bone/10 shadow-none neon-surface-framed"
                  src={sitePhotos.portraitFounder}
                  alt="بهرام رستمی"
                />
              </Reveal>
            </div>
            <div className="min-w-0 md:col-span-8">
              <Reveal>
                <Eyebrow className="max-[639px]:text-[0.65rem]">مدرس مسیر</Eyebrow>
              </Reveal>
              <Reveal delay={0.06}>
                <h2 className="mt-2 text-h3 text-balance md:mt-4 md:text-h2">بهرام رستمی</h2>
              </Reveal>
              <Reveal delay={0.12}>
                <p className="mt-1.5 text-sm leading-snug text-gold md:mt-2 md:text-base">
                  معمار مسیر رشد حرفه‌ای · بنیان‌گذار آکادمی
                </p>
              </Reveal>
              <Reveal delay={0.18}>
                <Quote
                  className="mt-4 h-5 w-5 text-gold/50 max-[639px]:mt-3 md:mt-6 md:h-7 md:w-7"
                  strokeWidth={1.4}
                  aria-hidden
                />
              </Reveal>
              <Reveal delay={0.22}>
                <p className="mt-2 text-lg font-medium leading-snug text-balance text-bone md:mt-3 md:text-h3">
                  «بدون ساختار روایت، اجرا نمی‌چسبد.»
                </p>
              </Reveal>
              <Reveal delay={0.28}>
                <p className="mt-3 text-sm text-bone-dim md:mt-5 md:text-base">۱۰+ سال آموزش و اجرا؛ تمرکز بر نسخه‌ی حرفه‌ای‌تر تو.</p>
              </Reveal>
              <Reveal delay={0.34}>
                <div className="mt-4 flex flex-wrap gap-2 md:mt-7 md:gap-3">
                  <Badge tone="emerald">۷۰۰٬۰۰۰+ مخاطب</Badge>
                  <Badge tone="gold">۵۰٬۰۰۰+ دانشجو</Badge>
                  <Badge>۱۰+ سال تجربه</Badge>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="bg-obsidian py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>صدای واقعی دانشجوها</Eyebrow>
          </Reveal>
          <CampaignWritingTestimonials
            items={[
              {
                avatar: sitePhotos.testimonialPortrait[0]!,
                name: "سارا ر.",
                role: "مشاور کسب‌وکار",
                quote: "اولین بار مسیر پیوسته گرفتم؛ سه ماه بعد، لیست انتظار.",
              },
              {
                avatar: sitePhotos.testimonialPortrait[1]!,
                name: "امیر ه.",
                role: "طراح تجربه",
                quote: "از پشت نمونه‌کارها بیرون آمدم؛ الان صدای حرفه‌ای خودم را می‌سازم.",
              },
              {
                avatar: sitePhotos.testimonialPortrait[2]!,
                name: "نازنین ک.",
                role: "مربی تغذیه",
                quote: "از جلسات تک‌نفره به گروه‌های پر رسیدم؛ کمپین برایم ساختار شد.",
              },
            ]}
          />
        </div>
      </section>

      {/* PRICING / ENROLL */}
      <section id="enroll" className="py-section-sm md:py-section">
        <div className="container-luxe min-w-0">
          <Reveal>
            <Eyebrow>ثبت‌نام در مسیر</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">سرمایه روی نسخه‌ی حرفه‌ای‌تر خودت.</h2>
          </Reveal>

          <div className="mt-6 grid gap-4 md:mt-10 md:gap-5 lg:grid-cols-3">
            <Reveal>
              <PricingCard
                tone="bone"
                tier="پایه"
                badge="ورود سریع"
                price="—"
                description="مسیر ۱۰ فصلی، تمرین‌ها و قالب‌ها."
                features={["۱۰ فصل ویدیویی", "تمرین‌ها و چک‌لیست‌ها", "دسترسی دائم"]}
                cta={{ href: "/apply", label: "شروع از همینجا" }}
              />
            </Reveal>
            <Reveal delay={0.07}>
              <PricingCard
                tone="emerald"
                tier="حرفه‌ای"
                badge="پیشنهاد ما"
                price="—"
                description="مسیر اصلی + انجمن خصوصی + بازخورد."
                features={[
                  "همه‌ی موارد پایه",
                  "انجمن خصوصی دانشجوها",
                  "جلسات ماهانه پرسش و پاسخ",
                  "اولویت در ارزیابی آکادمی",
                ]}
                cta={{ href: "/apply", label: "ثبت‌نام در مسیر حرفه‌ای" }}
                highlighted
              />
            </Reveal>
            <Reveal delay={0.14}>
              <PricingCard
                tone="gold"
                tier="آکادمی"
                badge="انتخابی"
                price="گفت‌وگو"
                description="آکادمی پس از ارزیابی؛ ورود انتخابی."
                features={["مسیر + منتور", "اتاق رشد و اپ خصوصی", "ورود با ارزیابی"]}
                cta={{ href: "/academy", label: "آشنایی با آکادمی" }}
              />
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <p className="mt-6 inline-flex items-center gap-2 text-caption text-mist md:mt-8">
              <Wallet className="h-4 w-4 text-gold" strokeWidth={1.5} aria-hidden />
              قیمت دقیق در صفحه‌ی ثبت‌نام نهایی اعلام می‌شود.
            </p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>سوالات متداول</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">پرسش‌های کلیدی قبل از ثبت‌نام.</h2>
          </Reveal>
          <div className="mt-6 md:mt-10">
            <Reveal>
              <Accordion items={faqs} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-section-sm md:py-section-xl">
        <div className="container-luxe min-w-0">
          <div className="neon-cta-slab relative overflow-hidden rounded-card border border-emerald/25 bg-gradient-to-b from-emerald-deep/40 via-charcoal/70 to-ink p-5 sm:p-8 md:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_85%_10%,rgba(0,140,150,0.22),transparent_70%)]"
            />
            <div className="relative">
              <IconTile icon={Compass} tone="gold" size="lg" className="max-sm:scale-90" />
              <h2 className="mt-5 max-w-full text-h2 text-balance md:mt-8 md:text-display">
                مسیر، اینجا شروع می‌شود.
              </h2>
              <p className="mt-4 max-w-2xl text-[0.9rem] text-bone-dim md:mt-6 md:text-base">
                قدم اول را بردار؛ بقیه کنار تو ساخته می‌شود.
              </p>
              <div className="mt-6 flex w-full max-w-md flex-col gap-2.5 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 md:mt-10">
                <LinkButton
                  href="/apply"
                  variant="sales"
                  size="lg"
                  withArrow
                  className={cn("w-full min-w-0 sm:w-auto", "max-lg:h-11 max-lg:min-h-11 max-lg:text-[0.9rem]")}
                >
                  شروع مسیر
                </LinkButton>
                <Link
                  href="/academy"
                  className="inline-flex items-center justify-center gap-2 text-gold transition-colors hover:text-gold-soft sm:justify-start"
                >
                  آشنایی با آکادمی
                  <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function CurriculumGroup({
  icon: Icon,
  title,
  chapters: list,
}: {
  icon: typeof Eye;
  title: string;
  chapters: { id: string; n: string; title: string; body: string }[];
}) {
  return (
    <div className="neon-surface-static grid gap-4 rounded-card border border-bone/10 bg-charcoal/40 p-4 md:grid-cols-12 md:gap-6 md:p-8">
      <div className="md:col-span-4">
        <IconTile icon={Icon} tone="emerald" size="lg" />
        <h3 className="mt-3 text-h3 text-bone md:mt-6">{title}</h3>
        <p className="mt-2 text-sm text-bone-dim md:mt-3 md:text-base">هر فصل: درس کوتاه، تمرین، چک‌لیست خروجی.</p>
        <p className="mt-3 inline-flex items-center gap-2 text-[0.7rem] text-gold md:mt-5 md:text-caption">
          <Headphones className="h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" strokeWidth={1.6} aria-hidden />
          ویدیو · صدا · متن
        </p>
      </div>
      <div className="md:col-span-8">
        <ul className="space-y-2 md:space-y-3">
          {list.map((c) => (
            <li
              key={c.id}
              className="flex items-start gap-2.5 rounded-tile border border-bone/8 bg-ink/40 p-3 md:gap-4 md:p-4"
            >
              <span className="num-latin shrink-0 rounded-pill border border-bone/15 px-2.5 py-1 text-caption text-bone-dim">
                {c.n}
              </span>
              <div>
                <p className="text-bone">{c.title}</p>
                <p className="mt-1 text-caption text-mist">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PricingCard({
  tone,
  tier,
  badge,
  price,
  description,
  features,
  cta,
  highlighted = false,
}: {
  tone: "bone" | "emerald" | "gold";
  tier: string;
  badge: string;
  price: string;
  description: string;
  features: string[];
  cta: { href: string; label: string };
  highlighted?: boolean;
}) {
  return (
    <article
      data-neon-tone={tone === "gold" ? "gold" : "emerald"}
      className={
        "relative flex h-full flex-col overflow-hidden rounded-card border p-4 sm:p-6 md:p-7 " +
        (highlighted
          ? "neon-cta-slab border-emerald/40 bg-gradient-to-b from-emerald-deep/35 via-charcoal/65 to-ink"
          : "neon-surface-hover border-bone/10 bg-charcoal/45")
      }
    >
      {highlighted ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_85%_5%,rgba(0,140,150,0.22),transparent_70%)]"
        />
      ) : null}
      <div className="relative flex items-center justify-between">
        <Badge tone={tone === "bone" ? "neutral" : tone}>{badge}</Badge>
        <CheckCircle2
          className={
            tone === "emerald"
              ? "h-5 w-5 text-emerald-glow"
              : tone === "gold"
                ? "h-5 w-5 text-gold"
                : "h-5 w-5 text-mist"
          }
          strokeWidth={1.5}
          aria-hidden
        />
      </div>
      <h3 className="relative mt-4 text-h3 text-bone sm:mt-6">{tier}</h3>
      <p className="relative mt-2 text-bone-dim">{description}</p>
      <p className="relative mt-5 text-h2 text-bone sm:mt-7">{price}</p>
      <ul className="relative mt-5 space-y-2.5 sm:mt-7 sm:space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-bone-dim">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-glow"
              strokeWidth={1.6}
              aria-hidden
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="relative mt-6 flex-1 sm:mt-8" />
      <LinkButton
        href={cta.href}
        variant={highlighted ? "sales" : "ghost"}
        withArrow
        className="relative w-full"
      >
        {cta.label}
      </LinkButton>
    </article>
  );
}
