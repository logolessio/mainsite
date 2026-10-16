import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Owner | logoless', robots: { index: false } }

/** The owner dashboard opens on the admin overview (or the developer overview for someone who is only a developer). */
export default async function Page() {
  const roles = (await getSession())?.user?.roles ?? []
  redirect(roles.includes('admin') || roles.length === 0 ? '/admin' : '/dev')
}
