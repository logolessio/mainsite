import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ActionLink } from '@/components/app/action-link'
import { EmptyState } from '@/components/app/table'
import { PageHeader } from '@/components/app/ui'
import { CampaignTile } from '@/components/browse/campaign-tile'
import { toCampaign, type CampaignRow } from '@/lib/campaigns-db'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Saved campaigns | logoless', robots: { index: false } }

export default async function Page() {
  if (!(await featureOn('saved-campaigns'))) notFound()
  const user = await pageUser()
  const d = await db()
  const rows = (
    await d
      .prepare("SELECT c.* FROM favorites f JOIN campaigns c ON c.id = f.campaign_id WHERE f.user_id = ?1 AND c.status = 'live' ORDER BY f.created_at DESC")
      .bind(user.id)
      .all<CampaignRow>()
  ).results.map(toCampaign)
  return (
    <>
      <PageHeader title="Saved campaigns" sub="Campaigns you've hearted that are still live. Heart one to hear when it changes." actions={<ActionLink href="/">Find more</ActionLink>} />
      {rows.length === 0 ? (
        <EmptyState icon="Megaphone" title="Nothing saved yet" body="Open a campaign and press the heart. It will wait for you here." action={<ActionLink href="/">Browse campaigns</ActionLink>} />
      ) : (
        <ul className="grid grid-cols-2 gap-4 [perspective:1400px] md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((c) => (
            <li key={c.id}>
              <CampaignTile campaign={c} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
