import { useNavigate } from 'react-router-dom'
import { MapPinOff } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/ui/States'
import { useStore } from '@/store/useStore'

export function NotFoundScreen() {
  const navigate = useNavigate()
  const isAuthed = useStore((s) => s.isAuthed)

  return (
    <Page withNav={false}>
      <TopBar title="صفحه پیدا نشد" showBack={isAuthed} onBack={() => navigate(-1)} />
      <EmptyState
        icon={<MapPinOff size={36} strokeWidth={1.8} />}
        title="این صفحه وجود ندارد"
        description="آدرس اشتباه است یا دیگر در دسترس نیست."
        action={{
          label: isAuthed ? 'بازگشت به خانه' : 'ورود به سات',
          onClick: () => navigate(isAuthed ? '/home' : '/login', { replace: true }),
        }}
      />
    </Page>
  )
}
