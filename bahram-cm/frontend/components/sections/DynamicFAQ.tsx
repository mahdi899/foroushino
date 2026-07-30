import { Reveal } from "@/components/motion/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SITE_FAQ_ITEMS } from "@/lib/data/siteFaqContent";

/**
 * Public FAQ block — content is build-stable in `lib/data/siteFaqContent.ts`.
 */
export async function DynamicFAQ() {
  const items = SITE_FAQ_ITEMS.filter((f) => f.question.trim() && f.answer.trim());
  if (items.length === 0) return null;

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
              <Accordion
                items={items.map((f) => ({ question: f.question, answer: f.answer }))}
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
