import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'
import { staffItems } from '@/lib/staff-nav'

export const metadata = { title: 'Developer | logoless', robots: { index: false, follow: false } }

/** The developer pages sit inside the owner dashboard, with the admin pages, under one sidebar. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requireSession('dev')
  return (
    <AppFrame area="Owner" roles={session?.user?.roles ?? ['admin', 'dev']} items={staffItems(session?.user?.roles ?? ['admin', 'dev'])}>
      {children}
    </AppFrame>
  )
}
