import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { staffHome } from '@/lib/staff-nav'

export const metadata: Metadata = { title: 'Owner | logoless', robots: { index: false } }

/** The owner dashboard opens on the admin overview (or the developer tools for someone who is only a developer). */
export default async function Page() {
  const roles = (await getSession())?.user?.roles ?? []
  redirect(staffHome(roles))
}
