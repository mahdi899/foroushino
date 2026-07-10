import type { Metadata } from "next";
import { PageHero } from "@/components/blocks/PageHero";
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
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Contact"
        title={site.contactPage.title}
        description={site.contactPage.description}
      />

      <section className="py-section-sm md:py-section">
        <div className="container-luxe">
          <div className="grid min-w-0 gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
            <Reveal className="lg:col-span-5 lg:self-center">
              <ContactMethods />
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-7">
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
