import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { SiteImage } from "@/components/ui/SiteImage";
import { LandingLeadForm } from "@/components/forms/LandingLeadForm";
import { getPublicLandingPage } from "@/lib/services/landingPages";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicLandingPage(slug);
  if (!result.ok) return {};

  return buildMetadata({
    title: result.data.title,
    description: result.data.subtitle || result.data.body || result.data.title,
    path: `/l/${slug}`,
    image: result.data.hero_image || undefined,
    noIndex: true,
  });
}

export default async function LandingLeadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicLandingPage(slug);

  if (!result.ok) {
    notFound();
  }

  const page = result.data;

  return (
    <main id="main-content" className="landing-lead-page relative min-w-0 max-w-full">
      {page.hero_image ? (
        <section className="relative isolate w-full overflow-hidden bg-ink">
          <div className="relative aspect-[16/10] w-full sm:aspect-[16/8] md:aspect-[16/6]">
            <SiteImage
              src={page.hero_image}
              alt={page.title}
              fallbackAlt={page.title}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10" />
          </div>
          <div className="absolute inset-x-0 bottom-0 pb-8 pt-16 md:pb-12">
            <div className="container-luxe">
              <Reveal>
                <div className="mx-auto max-w-2xl text-center">
                  <h1 className="font-display text-h2 text-balance text-bone">{page.title}</h1>
                  {page.subtitle ? (
                    <p className="mt-3 text-sm leading-relaxed text-bone-dim md:text-base">{page.subtitle}</p>
                  ) : null}
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      ) : (
        <section className="pt-8 md:pt-10 lg:pt-12">
          <div className="container-luxe">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="font-display text-h2 text-balance text-bone">{page.title}</h1>
                {page.subtitle ? (
                  <p className="mt-3 text-sm leading-relaxed text-bone-dim md:text-base">{page.subtitle}</p>
                ) : null}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <section className="pb-section-sm md:pb-section">
        <div className="container-luxe">
          <div className="mx-auto grid max-w-3xl gap-6 pt-8 md:pt-10">
            {page.body ? (
              <Reveal>
                <p className="whitespace-pre-line text-center text-sm leading-relaxed text-bone-dim md:text-base">
                  {page.body}
                </p>
              </Reveal>
            ) : null}

            <Reveal delay={0.06}>
              <LandingLeadForm
                slug={page.slug}
                formFields={page.form_fields}
                submitLabel={page.submit_label}
                successMessage={page.success_message}
              />
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
