import { EarningsMilestone } from '@/components/extras/earnings-milestone'
import { featureOn } from '@/lib/features'
import { creatorStats, forecast, isTrusted, levelFor, weeklyStreak } from '@/lib/growth'

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`

/**
 * The creator dashboard's "Your progress" row: a level, a weekly streak and a 30-day outlook, each behind its own switch, plus the party when
 * total earnings pass a round number. Worked out from submissions and earnings that are already stored.
 */
export async function GrowthCards({ userId }: { userId: string }) {
  const [levels, streaks, outlook, party] = await Promise.all([featureOn('creator-levels'), featureOn('streaks'), featureOn('earnings-forecast'), featureOn('earnings-milestones')])
  if (!levels && !streaks && !outlook && !party) return null
  const s = await creatorStats(userId)
  const lv = levelFor(s.views)
  const st = weeklyStreak(s.weeks)
  const fc = forecast(s)
  const trusted = isTrusted(s) && (await featureOn('trusted-creator'))
  return (
    <>
      {party && <EarningsMilestone userId={userId} cents={s.earnedCents} />}
      {(levels || streaks || outlook) && (
        <section aria-label="Your progress" className="mt-16">
          <h2 className="border-b border-line pb-4 font-display text-3xl tracking-[-0.03em]">Your progress</h2>
          <div className="mt-8 grid gap-x-10 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {levels && (
              <div>
                <p className="text-[15px] text-paper/50">Your level</p>
                <p className="mt-4 font-display text-5xl leading-none tracking-[-0.04em]">{lv.level.name}</p>
                <div className="mt-5 h-1.5 overflow-hidden rounded-pill bg-white/10" role="progressbar" aria-valuenow={lv.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to ${lv.next?.name ?? 'the top'}`}>
                  <div className="h-full rounded-pill bg-paper" style={{ width: `${lv.pct}%` }} />
                </div>
                <p className="mt-3 text-[15px] text-paper/50">{lv.next ? `${lv.toGo.toLocaleString('en-US')} more verified views to ${lv.next.name}.` : lv.level.line}</p>
                {trusted && <p className="mt-2 text-sm text-paper/70">Trusted: {s.approved} approved, almost none turned down.</p>}
              </div>
            )}
            {streaks && (
              <div>
                <p className="text-[15px] text-paper/50">Weekly streak</p>
                <p className="mt-4 font-display text-5xl leading-none tracking-[-0.04em] tabular-nums">
                  {st.streak}
                  <span className="ml-2 text-2xl text-paper/50">{st.streak === 1 ? 'week' : 'weeks'}</span>
                </p>
                <div className="mt-5 flex gap-1.5" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, i) => (
                    <span key={i} className={`h-1.5 flex-1 rounded-pill ${i < Math.min(8, st.streak) ? 'bg-paper' : 'bg-white/10'}`} />
                  ))}
                </div>
                <p className="mt-3 text-[15px] text-paper/50">{st.thisWeek ? 'You have submitted this week.' : st.streak > 0 ? 'Submit something this week to keep it going.' : 'Submit this week to start one.'}{st.best > st.streak ? ` Your best is ${st.best}.` : ''}</p>
              </div>
            )}
            {outlook && (
              <div>
                <p className="text-[15px] text-paper/50">The next 30 days</p>
                <p className="mt-4 font-display text-5xl leading-none tracking-[-0.04em] tabular-nums">{usd(fc.next)}</p>
                <p className="mt-5 text-[15px] text-paper/50">
                  {fc.next > 0 ? 'If the last 30 days repeat.' : 'Nothing earned in the last 30 days yet.'}
                  {fc.change !== null ? ` That is ${fc.change >= 0 ? 'up' : 'down'} ${Math.abs(fc.change)}% on the 30 days before.` : ''}
                </p>
                <p className="mt-1 text-xs text-paper/35">A guide from your own numbers, not a promise.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}
