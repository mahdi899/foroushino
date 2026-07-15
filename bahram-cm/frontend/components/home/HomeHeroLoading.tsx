import { SiteLoader } from '@/components/layout/SiteLoader';

/** Reserves hero viewport while home route loads — keeps footer below the fold. */
export function HomeHeroLoading() {
  return (
    <div
      className="home-hero-loading relative isolate flex min-h-[min(82svh,620px)] min-w-0 w-full max-w-full items-center justify-center overflow-x-clip lg:min-h-[min(72svh,720px)]"
      aria-busy="true"
      aria-label="در حال بارگذاری صفحه اصلی"
    >
      <SiteLoader size="lg" variant="page" label="در حال بارگذاری..." />
    </div>
  );
}
