import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { EarnGoal } from '@/components/app/earn-goal'
import { CountUp } from '@/components/app/count-up'
import { SetupBanner } from '@/components/app/setup-banner'
import { PageHeader } from '@/components/app/ui'
import { Badge, EmptyState } from '@/components/app/table'
import { TransitionLink } from '@/components/shell/transition-link'
import { db } from '@/lib/db'
import { balances } from '@/lib/ledger'
import { creatorSetup } from '@/lib/setup-steps'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Overview | logoless', robots: { index: false } }

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const [b, views, recent, steps] = await Promise.all([
    balances(user.id),
    d.prepare('SELECT COALESCE(SUM(views_verified), 0) AS v, COUNT(*) AS n FROM submissions WHERE user_id = ?1').bind(user.id).first<{ v: number; n: number }>(),
    d
      .prepare('SELECT s.id, s.campaign_id, s.status, s.views_verified, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 ORDER BY s.created_at DESC LIMIT 5')
      .bind(user.id)
      .all<{ id: string; campaign_id: string; status: string; views_verified: number; title: string }>(),
    creatorSetup(user),
  ])
  const first = (user.name ?? user.email.split('@')[0]).split(' ')[0]
  const clips = views?.n ?? 0

  return (
    <>
      <PageHeader title={`Welcome back, ${first}`} sub="Your balance, your submissions and anything that needs doing." />

      <SetupBanner steps={steps} guide="/dashboard/setup" />

      {/* the money, as four plain figures */}
      <section aria-label="Balance" className="grid gap-x-10 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
        <div className="border-t border-line-strong pt-5">
          <p className="text-[15px] text-paper/50">Available to withdraw</p>
          <p className="mt-6 font-display text-6xl leading-none tracking-[-0.045em] tabular-nums md:text-[4.5rem]">
            <CountUp value={usd(b.available)} />
          </p>
          <p className="mt-5 text-[15px] text-paper/50">{b.available > 0 ? 'Ready when you are.' : 'Earnings land here once your submissions are approved.'}</p>
          {b.pending > 0 && <p className="mt-1 text-[15px] text-paper/50">{usd(b.pending)} more is still being confirmed.</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            <ActionLink href="/dashboard/earnings#withdraw">Withdraw</ActionLink>
            <ActionLink href="/dashboard/earnings" variant="ghost">
              See earnings
            </ActionLink>
          </div>
        </div>
        {[
          { label: 'Total earned', value: usd(b.earned), note: 'Everything you have earned so far' },
          { label: 'Verified views', value: (views?.v ?? 0).toLocaleString(), note: `${clips} ${clips === 1 ? 'submission' : 'submissions'}` },
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

      <EarnGoal />

        <section aria-label="Recent submissions" className="mt-16">
          <div className="flex items-end justify-between border-b border-line pb-4">
            <h2 className="font-display text-3xl tracking-[-0.03em]">Recent submissions</h2>
            <TransitionLink href="/dashboard/submissions" className="text-[15px] text-paper/60 underline underline-offset-4 transition-colors hover:text-paper">
              View all
            </TransitionLink>
          </div>
          {recent.results.length === 0 ? (
            <EmptyState icon="Clapperboard" title="No submissions yet" body="Join a campaign, post your content and submit the link. It will show up here." action={<ActionLink href="/">Browse campaigns</ActionLink>} />
          ) : (
            <ul>
              {recent.results.map((r) => (
                <li key={r.id} className="border-b border-line">
                  <TransitionLink href={`/campaign/${r.campaign_id}`} className="flex items-center gap-4 py-5 transition-colors hover:bg-white/[0.02]">
                    <span className="min-w-0 flex-1 truncate text-lg">{r.title}</span>
                    <Badge tone={r.status === 'approved' ? 'good' : r.status === 'rejected' ? 'bad' : 'warn'}>{r.status === 'pending' ? 'in review' : r.status}</Badge>
                    <span className="hidden w-28 text-right text-[15px] text-paper/55 tabular-nums sm:block">{r.views_verified.toLocaleString()} views</span>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          )}
        </section>

    </>
  )
}
