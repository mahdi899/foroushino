import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { SeoAnalyticsDashboard } from './SeoAnalyticsDashboard';
import { SeoHub } from './SeoHub';

export default function AdminSeoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SeoHub analytics={<SeoAnalyticsDashboard />} />
    </Suspense>
  );
}
