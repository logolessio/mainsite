import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { Checklist } from '@/components/app/checklist'
import { CountUp } from '@/components/app/count-up'
import { PageHeader } from '@/components/app/ui'
import { Badge, EmptyState } from '@/components/app/table'
import { TransitionLink } from '@/components/shell/transition-link'
import { db } from '@/lib/db'
import { balances } from '@/lib/ledger'
import { SITE } from '@/lib/site'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Dashboard | logoless', robots: { index: false } }

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const [b, views, recent, profile, payRow] = await Promise.all([
    balances(user.id),
    d.prepare('SELECT COALESCE(SUM(views_verified), 0) AS v, COUNT(*) AS n FROM submissions WHERE user_id = ?1').bind(user.id).first<{ v: number; n: number }>(),
    d
      .prepare('SELECT s.id, s.status, s.views_verified, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 ORDER BY s.created_at DESC LIMIT 5')
      .bind(user.id)
      .all<{ id: string; status: string; views_verified: number; title: string }>(),
    d.prepare("SELECT bio, links_json FROM profiles WHERE user_id = ?1").bind(user.id).first<{ bio: string; links_json: string }>(),
    d.prepare('SELECT 1 AS x FROM settings WHERE key = ?1').bind(`paypal:${user.id}`).first(),
  ])
  const payEmail = Boolean(payRow)
  const first = (user.name ?? user.email.split('@')[0]).split(' ')[0]
  const clips = views?.n ?? 0
  const steps = [
    { label: 'Write your bio', body: 'A line or two about you, then pick your colours and font', href: '/dashboard/profile', done: Boolean(profile?.bio.trim()) },
    { label: 'Link your clipping accounts', body: 'TikTok, YouTube or Instagram. You choose if the public sees them', href: '/dashboard/accounts', done: Boolean(profile && profile.links_json !== '[]') },
    { label: 'Add your PayPal email', body: 'So you can withdraw your earnings', href: '/dashboard/payouts', done: payEmail },
    { label: 'Join your first campaign', body: 'Pick something you would actually clip', href: '/', done: clips > 0 },
  ]
  const done = steps.filter((s) => s.done).length

  return (
    <>
      <PageHeader title={`Welcome back, ${first}`} sub="Your balance, your clips and anything that needs doing." actions={<ActionLink href="/">Find a campaign</ActionLink>} />

      {/* the money, as four plain figures */}
      <section aria-label="Balance" className="grid gap-x-10 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border-t border-line-strong pt-5">
          <p className="text-[15px] text-paper/50">Available to withdraw</p>
          <p className="mt-6 font-display text-6xl leading-none tracking-[-0.045em] tabular-nums md:text-[4.5rem]">
            <CountUp value={usd(b.available)} />
          </p>
          <p className="mt-5 text-[15px] text-paper/50">{b.available > 0 ? 'Ready when you are.' : 'Earnings land here once your clips are approved.'}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ActionLink href="/dashboard/payouts">Withdraw</ActionLink>
            <ActionLink href="/dashboard/earnings" variant="ghost">
              See earnings
            </ActionLink>
          </div>
        </div>
        {[
          { label: 'Pending', value: usd(b.pending), note: `Clears within ${SITE.holdDays} days` },
          { label: 'Total earned', value: usd(b.earned), note: 'Everything you have earned so far' },
          { label: 'Verified views', value: (views?.v ?? 0).toLocaleString(), note: `${clips} ${clips === 1 ? 'clip' : 'clips'} submitted` },
        ].map((f) => (
          <div key={f.label} className="border-t border-line pt-5">
            <p className="text-[15px] text-paper/50">{f.label}</p>
            <p className="mt-6 font-display text-5xl leading-none tracking-[-0.045em] tabular-nums md:text-6xl">
              <CountUp value={f.value} />
            </p>
            <p className="mt-5 text-[15px] text-paper/50">{f.note}</p>
          </div>
        ))}
      </section>

      <div className="mt-20 grid gap-16 xl:grid-cols-12 xl:gap-12">
        <section aria-label="Recent clips" className="xl:col-span-7">
          <div className="flex items-end justify-between border-b border-line pb-4">
            <h2 className="font-display text-3xl tracking-[-0.03em]">Recent clips</h2>
            <TransitionLink href="/dashboard/submissions" className="text-[15px] text-paper/60 underline underline-offset-4 transition-colors hover:text-paper">
              View all
            </TransitionLink>
          </div>
          {recent.results.length === 0 ? (
            <EmptyState icon="Clapperboard" title="No clips yet" body="Join a campaign, post your clip and submit the link. It will show up here." action={<ActionLink href="/">Browse campaigns</ActionLink>} />
          ) : (
            <ul>
              {recent.results.map((r) => (
                <li key={r.id} className="flex items-center gap-4 border-b border-line py-5 transition-colors hover:bg-white/[0.02]">
                  <span className="min-w-0 flex-1 truncate text-lg">{r.title}</span>
                  <Badge tone={r.status === 'approved' ? 'good' : r.status === 'rejected' ? 'bad' : 'warn'}>{r.status}</Badge>
                  <span className="w-28 text-right text-[15px] text-paper/55 tabular-nums">{r.views_verified.toLocaleString()} views</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Next steps" className="xl:col-span-5">
          <div className="flex items-end justify-between border-b border-line pb-4">
            <h2 className="font-display text-3xl tracking-[-0.03em]">Getting set up</h2>
            <p className="text-[15px] text-paper/50 tabular-nums">
              {done} of {steps.length} done
            </p>
          </div>
          <div className="h-px bg-line">
            <div className="h-px bg-paper transition-all duration-700" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
          <Checklist items={steps} />
        </section>
      </div>
    </>
  )
}
