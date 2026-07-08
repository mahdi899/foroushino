import { SeoAnalyticsDashboard } from './SeoAnalyticsDashboard';
import { SeoHub } from './SeoHub';

export default async function AdminSeoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const initialTab = sp.tab === 'meta' ? 'meta' : 'analytics';

  return <SeoHub initialTab={initialTab} analytics={<SeoAnalyticsDashboard />} />;
}
