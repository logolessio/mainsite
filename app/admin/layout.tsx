import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'
import { staffItems } from '@/lib/staff-nav'

export const metadata = { title: 'Admin | logoless', robots: { index: false, follow: false } }

/** The admin pages sit inside the owner dashboard, with the developer pages, under one sidebar. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requireSession('admin')
  return (
    <AppFrame area="Owner" items={staffItems(session?.user?.roles ?? ['admin', 'dev'])}>
      {children}
    </AppFrame>
  )
}
