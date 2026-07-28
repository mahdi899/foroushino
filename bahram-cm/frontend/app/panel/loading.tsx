import { headers } from 'next/headers';
import { SiteLoader } from '@/components/layout/SiteLoader';

/**
 * Only /panel/login uses a local loader here.
 * Authenticated shell entry/navigation is handled solely by
 * app/panel/(shell)/loading.tsx so users never see two stacked loaders.
 */
export default async function PanelLoading() {
  const pathname = (await headers()).get('x-pathname') ?? '';

  if (pathname.startsWith('/panel/login')) {
    return (
      <div className="site-route-loading site-route-loading--panel-inset">
        <SiteLoader size="md" variant="page" label="" ariaLabel="در حال بارگذاری" />
      </div>
    );
  }

  return null;
}
