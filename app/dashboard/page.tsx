import type { Metadata } from 'next'
import { ArrowUpRight, Clapperboard, Landmark, Search, UserCheck } from 'lucide-react'
import { ActionLink } from '@/components/app/action-link'
import { Bento, Tile } from '@/components/app/bento'
import { Checklist } from '@/components/app/checklist'
import { CountUp } from '@/components/app/count-up'
import { PageHeader } from '@/components/app/ui'
import { Badge, EmptyState } from '@/components/app/table'
import { TransitionLink } from '@/components/shell/transition-link'
import { db } from '@/lib/db'
import { balances } from '@/lib/ledger'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Dashboard | logoless', robots: { index: false } }

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const [b, views, recent, profile] = await Promise.all([
    balances(user.id),
    d.prepare('SELECT COALESCE(SUM(views_verified), 0) AS v, COUNT(*) AS n FROM submissions WHERE user_id = ?1').bind(user.id).first<{ v: number; n: number }>(),
    d
      .prepare('SELECT s.id, s.status, s.views_verified, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 ORDER BY s.created_at DESC LIMIT 5')
      .bind(user.id)
      .all<{ id: string; status: string; views_verified: number; title: string }>(),
    d.prepare("SELECT bio, links_json FROM profiles WHERE user_id = ?1").bind(user.id).first<{ bio: string; links_json: string }>(),
  ])
  const first = (user.name ?? user.email.split('@')[0]).split(' ')[0]
  const clips = views?.n ?? 0
  const steps = [
    { label: 'Make your profile yours', body: 'Banner, colours, font and links', href: '/dashboard/profile', done: Boolean(profile && (profile.bio.trim() || profile.links_json !== '[]')) },
    { label: 'Link a social account', body: 'TikTok, YouTube or Instagram', href: '/dashboard/accounts' },
    { label: 'Connect payouts', body: 'So you can withdraw your earnings', href: '/dashboard/payouts', done: Boolean(user.connect_ready) },
    { label: 'Join your first campaign', body: 'Pick something you would actually clip', href: '/', done: clips > 0 },
  ]
  const done = steps.filter((s) => s.done).length

  return (
    <>
      <PageHeader title={`Welcome back, ${first}`} sub="Your money, your clips and what to do next, all in one place." actions={<ActionLink href="/">Find a campaign</ActionLink>} />

      <Bento>
        {/* the number everyone comes for */}
        <Tile className="p-7 md:col-span-6 xl:col-span-5 xl:row-span-2">
          <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-paper/[0.05] blur-3xl" />
          <p className="text-sm text-mute">Available to withdraw</p>
          <p className="mt-4 font-display text-6xl leading-none font-medium tracking-tight tabular-nums md:text-7xl">
            <CountUp value={usd(b.available)} />
          </p>
          <p className="mt-4 text-sm text-mute">{b.available > 0 ? 'Ready when you are.' : 'Earnings land here once your clips are approved.'}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            <ActionLink href="/dashboard/payouts">Withdraw</ActionLink>
            <ActionLink href="/dashboard/earnings" variant="ghost">
              See earnings
            </ActionLink>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-line pt-6">
            <div>
              <p className="text-xs text-mute">Pending</p>
              <p className="mt-1.5 text-xl font-medium tabular-nums">{usd(b.pending)}</p>
              <p className="mt-1 text-xs text-mute">Clearing</p>
            </div>
            <div>
              <p className="text-xs text-mute">Total earned</p>
              <p className="mt-1.5 text-xl font-medium tabular-nums">{usd(b.earned)}</p>
              <p className="mt-1 text-xs text-mute">All time</p>
            </div>
          </div>
        </Tile>

        <Tile className="p-6 md:col-span-3 xl:col-span-3">
          <p className="text-sm text-mute">Verified views</p>
          <p className="mt-3 font-display text-4xl leading-none font-medium tracking-tight tabular-nums">
            <CountUp value={(views?.v ?? 0).toLocaleString()} />
          </p>
          <p className="mt-3 text-xs text-mute">
            {clips} {clips === 1 ? 'clip' : 'clips'}
          </p>
        </Tile>

        <Tile className="p-6 md:col-span-3 xl:col-span-4">
          <p className="text-sm text-mute">Get set up</p>
          <p className="mt-3 font-display text-4xl leading-none font-medium tracking-tight tabular-nums">
            {done}
            <span className="text-mute"> / {steps.length}</span>
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-paper transition-all duration-700" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
        </Tile>

        <Tile className="p-2 md:col-span-6 xl:col-span-7">
          <div className="grid gap-1 sm:grid-cols-3">
            {[
              { href: '/', icon: Search, label: 'Find a campaign', sub: 'Browse what pays' },
              { href: '/dashboard/submissions', icon: Clapperboard, label: 'Submit a clip', sub: 'Paste your link' },
              { href: '/dashboard/profile', icon: UserCheck, label: 'Edit profile', sub: 'Your public page' },
            ].map((a) => (
              <TransitionLink key={a.href} href={a.href} className="group flex flex-col gap-6 rounded-2xl p-4 transition-colors hover:bg-white/[0.05]">
                <span className="flex items-center justify-between">
                  <a.icon aria-hidden="true" className="size-5 text-mute transition-colors group-hover:text-paper" />
                  <ArrowUpRight aria-hidden="true" className="size-4 text-mute opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </span>
                <span>
                  <span className="block text-[15px] font-medium">{a.label}</span>
                  <span className="block text-xs text-mute">{a.sub}</span>
                </span>
              </TransitionLink>
            ))}
          </div>
        </Tile>

        <Tile className="md:col-span-6 xl:col-span-7">
          <div className="flex items-center justify-between px-6 pt-6">
            <h2 className="text-base font-medium tracking-tight">Recent clips</h2>
            <TransitionLink href="/dashboard/submissions" className="text-sm text-mute transition-colors hover:text-paper">
              View all
            </TransitionLink>
          </div>
          {recent.results.length === 0 ? (
            <EmptyState icon="Clapperboard" title="No clips yet" body="Join a campaign, post your clip and submit the link. It will show up here." action={<ActionLink href="/">Browse campaigns</ActionLink>} />
          ) : (
            <ul className="mt-3 divide-y divide-line/60 pb-2">
              {recent.results.map((r) => (
                <li key={r.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-white/[0.025]">
                  <span className="min-w-0 flex-1 truncate text-[15px]">{r.title}</span>
                  <Badge tone={r.status === 'approved' ? 'good' : r.status === 'rejected' ? 'bad' : 'warn'}>{r.status}</Badge>
                  <span className="w-24 text-right text-sm text-mute tabular-nums">{r.views_verified.toLocaleString()} views</span>
                </li>
              ))}
            </ul>
          )}
        </Tile>

        <Tile className="p-6 md:col-span-6 xl:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium tracking-tight">Next steps</h2>
            <Landmark aria-hidden="true" className="size-4 text-mute" />
          </div>
          <div className="mt-2">
            <Checklist items={steps} />
          </div>
        </Tile>
      </Bento>
    </>
  )
}
