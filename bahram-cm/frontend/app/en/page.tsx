import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Academy — English Shell",
  description: "Minimal English overview of the private Academy ecosystem.",
  path: "/en",
});

export default function EnglishShellPage() {
  return (
    <main id="main-content" className="container-luxe relative min-w-0 max-w-full py-16 md:py-24">
      <section className="mx-auto max-w-3xl min-w-0">
        <div className="hairline-gold mb-6" />
        <h1 className="text-h2 font-display text-bone">Academy (English Shell)</h1>
        <p className="mt-4 text-body text-bone-dim">
          Private growth ecosystem for Persian-speaking creators and educators.
        </p>
        <p className="mt-4 text-body text-mist">Minimal English page; core experience stays Persian-first.</p>
        <div className="glass neon-surface-static mt-8 rounded-card p-5 md:p-6">
          <h2 className="text-h3 font-display">What you get</h2>
          <ul className="mt-4 list-disc space-y-2 ps-5 text-bone-dim">
            <li>Structured path — not a passive library</li>
            <li>Daily mentor voice + strategic guidance</li>
            <li>Private dashboard for members</li>
            <li>Live sessions and long-term tracking</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

