import { headers } from 'next/headers';
import { HomeHeroLoading } from '@/components/home/HomeHeroLoading';
import { SiteLoader } from '@/components/layout/SiteLoader';

function isBareShellPath(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') || pathname.startsWith('/panel') || pathname.startsWith('/family')
  );
}

export default async function Loading() {
  const pathname = (await headers()).get('x-pathname') ?? '';

  // Family/panel/admin use their own shell skeletons. Also skip when the
  // pathname header is missing on RSC flights — otherwise the site loader flashes.
  if (!pathname || isBareShellPath(pathname)) return null;

  if (pathname === '/') {
    return <HomeHeroLoading />;
  }

  return (
    <div className="site-route-loading">
      <SiteLoader size="lg" variant="page" label="در حال بارگذاری صفحه..." />
    </div>
  );
}
