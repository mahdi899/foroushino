import { Reveal } from "@/components/motion/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getFaqs } from "@/lib/services/faqs";

/**
 * Admin-managed FAQ block. Rendered alongside the static `FAQ` section so
 * editors can add/update questions from the dashboard without a deploy.
 * Renders nothing if the backend has no active FAQs (or is unreachable).
 */
export async function DynamicFAQ() {
  const result = await getFaqs();
  if (!result.ok || result.data.length === 0) return null;

  return (
    <section className="bg-obsidian py-section">
      <div className="container-luxe">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Reveal>
              <Eyebrow>سوالات به‌روز</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 text-h2 text-balance">پرسش‌های تازه‌ی مخاطب‌ها.</h2>
            </Reveal>
          </div>
          <div className="md:col-span-7">
            <Reveal>
              <Accordion
                items={result.data.map((f) => ({ question: f.question, answer: f.answer }))}
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
