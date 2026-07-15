import { headers } from 'next/headers';
import { FamilyShellLoading } from '@/components/family/FamilyShellLoading';
import { SiteLoader } from '@/components/layout/SiteLoader';

export default async function FamilyLoading() {
  const pathname = (await headers()).get('x-pathname') ?? '';

  if (pathname.startsWith('/family/login')) {
    return (
      <div className="site-route-loading site-route-loading--family flex-1">
        <SiteLoader size="md" variant="page" label="در حال بارگذاری…" />
      </div>
    );
  }

  return <FamilyShellLoading />;
}
