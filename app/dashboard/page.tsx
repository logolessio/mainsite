import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { EarnGoal } from '@/components/app/earn-goal'
import { CountUp } from '@/components/app/count-up'
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
      .prepare('SELECT s.id, s.status, s.views_verified, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 ORDER BY s.created_at DESC LIMIT 5')
      .bind(user.id)
      .all<{ id: string; status: string; views_verified: number; title: string }>(),
    creatorSetup(user),
  ])
  const first = (user.name ?? user.email.split('@')[0]).split(' ')[0]
  const clips = views?.n ?? 0
  const needed = steps.filter((s) => !s.optional)
  const done = needed.filter((s) => s.done).length
  const next = needed.find((s) => !s.done)

  return (
    <>
      <PageHeader title={`Welcome back, ${first}`} sub="Your balance, your clips and anything that needs doing." actions={<ActionLink href="/">Find a campaign</ActionLink>} />

      {next && (
        <section aria-label="Finish setting up" className="mb-14 rounded-[2rem] border border-line-strong bg-black/45 p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[15px] text-paper/55">Finish setting up</p>
            <p className="text-[15px] text-paper/55 tabular-nums">
              {done} of {needed.length} done
            </p>
          </div>
          <div className="mt-3 flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={needed.length} aria-valuenow={done} aria-label="Set-up steps done">
            {needed.map((s) => (
              <span key={s.id} className={s.done ? 'h-1.5 flex-1 rounded-full bg-paper' : 'h-1.5 flex-1 rounded-full bg-white/12'} />
            ))}
          </div>
          <h2 className="mt-6 font-display text-3xl leading-[1.05] tracking-[-0.03em] md:text-4xl">{next.title}</h2>
          <p className="mt-2 text-[16px] text-paper/60">{next.short}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ActionLink href={next.id === 'verify' ? '/dashboard/setup' : (next.href ?? '/dashboard/setup')}>{next.id === 'verify' ? 'Confirm it now' : (next.cta ?? 'Continue')}</ActionLink>
            <ActionLink href="/dashboard/setup" variant="ghost">
              See all the steps
            </ActionLink>
          </div>
        </section>
      )}

      {/* the money, as four plain figures */}
      <section aria-label="Balance" className="grid gap-x-10 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
        <div className="border-t border-line-strong pt-5">
          <p className="text-[15px] text-paper/50">Available to withdraw</p>
          <p className="mt-6 font-display text-6xl leading-none tracking-[-0.045em] tabular-nums md:text-[4.5rem]">
            <CountUp value={usd(b.available)} />
          </p>
          <p className="mt-5 text-[15px] text-paper/50">{b.available > 0 ? 'Ready when you are.' : 'Earnings land here once your clips are approved.'}</p>
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

      <EarnGoal />

        <section aria-label="Recent clips" className="mt-16">
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

    </>
  )
}
