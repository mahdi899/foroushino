import { SiteLoader } from '@/components/layout/SiteLoader';

type Props = {
  /** Accessible name only — not shown visually. */
  label?: string;
};

/** Branded full-page loader — spinner only; label stays for screen readers. */
export function SiteRouteLoading({ label = 'در حال بارگذاری' }: Props) {
  return (
    <div className="site-route-loading" aria-busy="true" aria-label={label}>
      <SiteLoader size="lg" variant="page" label="" ariaLabel={label} />
    </div>
  );
}
