import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { SubmissionsFeed } from '@/components/submissions/feed'
import { isClipPlatform } from '@/lib/clip-embed'
import { feedCampaigns, feedPage, viewerId, type FeedSort } from '@/lib/clip-feed'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'

export const metadata: Metadata = { title: 'Submissions | logoless', description: 'Every clip posted for campaigns on logoless. Watch them, rate them and meet the creators who made them.' }

type Props = { searchParams: Promise<{ sort?: string; platform?: string; campaign?: string }> }

export default async function Page({ searchParams }: Props) {
  await connection()
  if (!(await featureOn('submissions-feed'))) notFound()
  const sp = await searchParams
  const sort: FeedSort = sp.sort === 'top' || sp.sort === 'views' ? sp.sort : 'new'
  const platform = sp.platform && isClipPlatform(sp.platform) ? sp.platform : null
  const campaign = sp.campaign && /^[\w-]{1,80}$/.test(sp.campaign) ? sp.campaign : null
  const viewer = await viewerId()
  const [first, campaigns, me] = await Promise.all([
    feedPage({ sort, platform, campaign, viewerId: viewer }),
    feedCampaigns(),
    viewer ? db().then((d) => d.prepare('SELECT handle FROM profiles WHERE user_id = ?1').bind(viewer).first<{ handle: string }>()) : null,
  ])
  return (
    <main className={`${CONTAINER} pt-32 pb-40 md:pt-40`}>
      <SubmissionsFeed initial={first} campaigns={campaigns} filters={{ sort, platform, campaign }} signedIn={viewer !== null} me={me?.handle ?? null} />
    </main>
  )
}
