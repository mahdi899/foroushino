import { SiteLoader } from '@/components/layout/SiteLoader';

type Props = {
  label?: string;
};

/** Branded full-page loader — use in app/loading.tsx and route-level loading states. */
export function SiteRouteLoading({ label = 'در حال بارگذاری...' }: Props) {
  return (
    <div className="site-route-loading" aria-busy="true" aria-label={label}>
      <SiteLoader size="lg" variant="page" label={label} />
    </div>
  );
}
