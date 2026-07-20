import { headers } from 'next/headers';
import { SiteRouteLoading } from '@/components/layout/SiteRouteLoading';
import { isFamilyHost } from '@/lib/domains';

function isBareShellPath(pathname: string, onFamilyHost: boolean): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/panel') ||
    pathname.startsWith('/family') ||
    onFamilyHost
  );
}

export default async function Loading() {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';
  const host = headerList.get('host')?.split(':')[0] ?? '';
  const onFamilyHost =
    headerList.get('x-family-host') === '1' || isFamilyHost(host);

  if (!pathname || isBareShellPath(pathname, onFamilyHost)) return null;

  return <SiteRouteLoading />;
}
