import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactMethods } from "@/components/sections/ContactMethods";
import { Reveal } from "@/components/motion/Reveal";
import { site } from "@/content/site";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: site.contactPage.title,
  description: site.contactPage.description,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main id="main-content" className="contact-page relative min-w-0 max-w-full pt-8 md:pt-10 lg:pt-12">
      <section className="pb-section-sm md:pb-section">
        <div className="container-luxe">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="font-display text-h2 text-balance text-bone">{site.contactPage.title}</h1>
              <p className="mt-3 text-sm leading-relaxed text-bone-dim md:text-base">
                {site.contactPage.description}
              </p>
            </div>
          </Reveal>

          <div className="mt-8 grid min-w-0 items-stretch gap-5 md:mt-10 md:gap-6 lg:grid-cols-12 lg:gap-8">
            <Reveal className="lg:col-span-4">
              <ContactMethods className="lg:sticky lg:top-24" />
            </Reveal>
            <Reveal delay={0.06} className="lg:col-span-8">
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
