import { SiteLoader } from '@/components/layout/SiteLoader';

export default function Loading() {
  return (
    <div className="site-route-loading">
      <SiteLoader size="lg" variant="page" label="در حال بارگذاری صفحه..." />
    </div>
  );
}
