import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers3 } from 'lucide-react'
import { CatalogSettingsSection } from '@/features/admin/CatalogSettingsSection'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { DataGate } from '@/components/pwa/DataGate'
import { useStore } from '@/store/useStore'
import { canManageCatalog } from '@/lib/permissions'

export function CatalogAdminScreen() {
  const navigate = useNavigate()
  const permissions = useStore((s) => s.permissions)
  const allowed = canManageCatalog(permissions)

  useEffect(() => {
    if (!allowed) {
      navigate('/profile', { replace: true })
    }
  }, [allowed, navigate])

  if (!allowed) return null

  return (
    <Page withNav={false}>
      <ScreenHeader sticky showBack title="محصولات و منابع ورود" icon={Layers3} iconTone="primary" />

      <DataGate mode="placeholder">
        <div className="space-y-5 px-4 pb-24 pt-2">
          <CatalogSettingsSection />
        </div>
      </DataGate>
    </Page>
  )
}
