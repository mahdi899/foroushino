import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  const hasHero = Boolean(page.hero_image);

  return (
    <main
      id="main-content"
      className="landing-lead-page fixed inset-0 z-[60] min-h-dvh w-full overflow-hidden bg-ink"
    >
      <section className="relative isolate flex h-dvh w-full flex-col overflow-hidden">
        {hasHero ? (
          <div className="absolute inset-0">
            <SiteImage
              src={page.hero_image!}
              alt={page.title}
              fallbackAlt={page.title}
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-ink/45 via-ink/50 to-ink/80"
            />
          </div>
        ) : null}

        <div className="relative z-10 flex h-full min-h-0 flex-col justify-center px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 md:px-10 md:py-12">
          <div className="mx-auto flex w-full max-w-lg flex-col justify-center md:max-w-xl">
            <header className="shrink-0 text-center">
              <h1 className="font-display text-balance text-[2.75rem] leading-[1.15] text-bone drop-shadow-sm sm:text-[3rem] md:text-[2.75rem] lg:text-[3.25rem]">
                {page.title}
              </h1>
              {page.subtitle ? (
                <p className="mt-3 text-center text-xl leading-relaxed text-bone-dim drop-shadow-sm sm:text-[1.35rem] md:text-xl">
                  {page.subtitle}
                </p>
              ) : null}
              {page.body ? (
                <p className="mt-2.5 line-clamp-3 whitespace-pre-line text-center text-base leading-relaxed text-bone-dim sm:mt-3 sm:line-clamp-none sm:text-lg">
                  {page.body}
                </p>
              ) : null}
            </header>

            <div className="mt-4 sm:mt-6 md:mt-8">
              <LandingLeadForm
                slug={page.slug}
                formFields={page.form_fields}
                submitLabel={page.submit_label}
                successMessage={page.success_message}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
