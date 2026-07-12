import { Reveal } from "@/components/motion/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getFaqs } from "@/lib/services/faqs";

/**
 * Admin-managed FAQ block for /faq and other public pages.
 * Renders nothing if the backend has no active FAQs (or is unreachable).
 */
export async function DynamicFAQ() {
  const result = await getFaqs();
  if (!result.ok || result.data.length === 0) return null;

  const items = [...result.data]
    .filter((f) => f.question.trim() && f.answer.trim())
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

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
