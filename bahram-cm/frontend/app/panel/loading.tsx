import { headers } from 'next/headers';
import { PanelShellLoading } from '@/components/student-panel/layout/PanelShellLoading';
import { SiteLoader } from '@/components/layout/SiteLoader';

/**
 * Entry into /panel (from the marketing site) — show panel chrome skeleton so
 * the user never gets a blank white frame while auth + RSC resolve.
 *
 * In-panel page switches use (shell)/loading.tsx instead; this file does not
 * remount for those navigations.
 */
export default async function PanelLoading() {
  const pathname = (await headers()).get('x-pathname') ?? '';

  if (pathname.startsWith('/panel/login')) {
    return (
      <div className="site-route-loading site-route-loading--panel-inset">
        <SiteLoader size="md" variant="page" label="در حال بارگذاری..." />
      </div>
    );
  }

  return <PanelShellLoading />;
}
