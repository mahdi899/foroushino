import { Reveal } from "@/components/motion/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { Eyebrow } from "@/components/ui/Eyebrow";

const items = [
  {
    question: "کمپین‌نویسی برای چه کسانی است؟",
    answer: "صاحبان حرفه، خالقان محتوا، مشاوران؛ هر کس می‌خواهد صدا را کمپین‌محور کند.",
  },
  {
    question: "نیاز به تجربه قبلی دارم؟",
    answer: "نه؛ از نگاه و پیام شروع می‌کنیم. با پیشینه‌ی محتوا، سریع‌تر پیش می‌روی.",
  },
  {
    question: "تفاوت دوره با آکادمی چیست؟",
    answer: "دوره، در اول است؛ آکادمی، فضای بعدی برای اجرای عمیق و همراهی نزدیک.",
  },
  {
    question: "چقدر باید زمان بگذارم؟",
    answer: "هفته‌ای حدود ۳ تا ۵ ساعت برای اجرای جدی؛ خروجی با عمل است، نه با تماشا.",
  },
  {
    question: "آیا بازگشت وجه دارد؟",
    answer: "بله؛ در بازه‌ی ابتدای دوره، طبق سیاست رسمی.",
  },
  {
    question: "چطور وارد آکادمی می‌شوم؟",
    answer: "بعد از پیشرفت و ارزیابی، تیم تناسب را می‌سنجد؛ ورود انتخابی است.",
  },
];

export function FAQ() {
  return (
    <section className="py-section">
      <div className="container-luxe">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Reveal>
              <Eyebrow>سوالات متداول</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 text-h2 text-balance">پرسش‌های قبل از ورود.</h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-5 max-w-md text-body text-bone-dim">
                سوال دیگری داری؟ از بخش ارتباط در تماس باش.
              </p>
            </Reveal>
          </div>
          <div className="md:col-span-7">
            <Reveal>
              <Accordion items={items} />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
