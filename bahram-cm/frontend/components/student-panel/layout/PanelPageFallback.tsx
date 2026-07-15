import { SiteLoader } from '@/components/layout/SiteLoader';

/** Lightweight in-shell placeholder while a panel page streams. */
export function PanelPageFallback() {
  return (
    <div className="panel-page-inner site-route-loading site-route-loading--panel-inset">
      <SiteLoader size="md" variant="page" label="در حال بارگذاری..." />
    </div>
  );
}
