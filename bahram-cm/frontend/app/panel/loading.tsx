import { headers } from 'next/headers';
import { PanelShellLoading } from '@/components/student-panel/layout/PanelShellLoading';
import { SiteLoader } from '@/components/layout/SiteLoader';

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
