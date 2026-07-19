import { headers } from 'next/headers';
import { SiteRouteLoading } from '@/components/layout/SiteRouteLoading';

function isBareShellPath(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') || pathname.startsWith('/panel') || pathname.startsWith('/family')
  );
}

export default async function Loading() {
  const pathname = (await headers()).get('x-pathname') ?? '';

  if (!pathname || isBareShellPath(pathname)) return null;

  return <SiteRouteLoading />;
}
