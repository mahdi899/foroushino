import { AdminPage } from '../../ui';
import { getIdentityProviders, getIdentityRoutes } from '@/lib/admin/identityData';
import { can, getCurrentUser } from '@/lib/auth/session';
import { IdentityProvidersClient } from './IdentityProvidersClient';

export const dynamic = 'force-dynamic';

export default async function IdentityProvidersPage() {
  const user = await getCurrentUser();
  const [{ items: providers, error: pErr }, { items: routes, error: rErr }] = await Promise.all([
    getIdentityProviders(),
    getIdentityRoutes(),
  ]);

  return (
    <AdminPage
      icon="Cable"
      headerVariant="settings"
      title="سرویس‌های احراز هویت"
      desc="پیکربندی مسیر قابلیت‌ها و کلید سرویس‌ها — مقادیر حساس هرگز نمایش داده نمی‌شوند"
    >
      {(pErr || rErr) && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
          {pErr ?? rErr}
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
