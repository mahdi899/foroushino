import { SiteLoader } from '@/components/layout/SiteLoader';

export default function Loading() {
  return (
    <div className="site-route-loading site-route-loading--panel">
      <SiteLoader size="md" variant="page" label="در حال بارگذاری پنل..." />
    </div>
  );
}
