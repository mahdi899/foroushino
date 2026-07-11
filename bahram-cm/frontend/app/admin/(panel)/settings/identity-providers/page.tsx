import { AdminPage } from '../../ui';
import { fetchIdentityProviderSettings } from '@/lib/admin/identityData';
import { can, getCurrentUser } from '@/lib/auth/session';
import { IdentityProvidersClient } from './IdentityProvidersClient';

export const dynamic = 'force-dynamic';

export default async function IdentityProvidersPage() {
  const user = await getCurrentUser();
  const { providers, routes, error } = await fetchIdentityProviderSettings();

  return (
    <AdminPage
      icon="Cable"
      headerVariant="settings"
      title="سرویس‌های احراز هویت"
      desc="پیکربندی سرویس‌ها و مسیر Primary/Fallback — هر بخش با رنگ و آیکن جدا"
    >
      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
          {error}
        </div>
      )}

      <IdentityProvidersClient
        providers={providers}
        routes={routes}
        canManage={can(user, 'identity_provider.manage')}
        canTest={can(user, 'identity_provider.test')}
      />
    </AdminPage>
  );
}
