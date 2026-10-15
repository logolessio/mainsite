import type { Metadata } from 'next'
import { Hub } from '@/components/app/hub'
import { BRAND_HUB } from '@/lib/hubs'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Dashboard | logoless', robots: { index: false } }

/** The front page of the brand dashboard: every section as an icon. */
export default async function Page() {
  const user = await pageUser()
  const first = (user.name ?? user.email.split('@')[0]).split(' ')[0]
  return <Hub title={`Welcome, ${first}`} sub="Where would you like to go?" groups={BRAND_HUB} />
}
