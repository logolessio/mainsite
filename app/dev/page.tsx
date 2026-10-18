import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { staffHome } from '@/lib/staff-nav'

/** The old Developer overview is System, Health now (for admins); a developer who is not an admin starts at Features. */
export default async function Page() {
  const roles = (await getSession())?.user?.roles ?? []
  redirect(roles.includes('admin') ? '/admin/system' : staffHome(roles))
}
