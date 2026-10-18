import { notFound } from 'next/navigation'
import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'
import { staffItems } from '@/lib/staff-nav'

export const metadata = { title: 'Owner | logoless', robots: { index: false, follow: false } }

/** The front door of the owner dashboard: for anyone who is an admin, a developer or both. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const roles = session?.user?.roles ?? ['admin', 'dev']
  if (!roles.includes('admin') && !roles.includes('dev')) notFound()
  return (
    <AppFrame area="Owner" roles={roles} items={staffItems(roles)}>
      {children}
    </AppFrame>
  )
}
