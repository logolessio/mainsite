/** The parts of the growth features that need no database, so browser code can use them too. */
const nowSec = () => Math.floor(Date.now() / 1000)

// ---------- levels ----------
export const LEVELS = [
  { id: 'rookie', name: 'Rookie', from: 0, line: 'Everyone starts here.' },
  { id: 'cutter', name: 'Cutter', from: 10_000, line: 'Your clips are getting seen.' },
  { id: 'editor', name: 'Editor', from: 100_000, line: 'Brands will notice a name like yours.' },
  { id: 'pro', name: 'Pro', from: 500_000, line: 'Half a million views, verified.' },
  { id: 'elite', name: 'Elite', from: 2_000_000, line: 'Top of the leaderboard territory.' },
  { id: 'legend', name: 'Legend', from: 10_000_000, line: 'There is nowhere higher to go.' },
] as const
export type Level = (typeof LEVELS)[number]

export function levelFor(views: number): { level: Level; next: Level | null; pct: number; toGo: number; index: number } {
  let index = 0
  LEVELS.forEach((l, i) => {
    if (views >= l.from) index = i
  })
  const level = LEVELS[index]
  const next = LEVELS[index + 1] ?? null
  const pct = next ? Math.max(0, Math.min(100, Math.round(((views - level.from) / (next.from - level.from)) * 100))) : 100
  return { level, next, pct, toGo: next ? Math.max(0, next.from - views) : 0, index }
}

export type CreatorStats = {
  views: number
  approved: number
  rejected: number
  pending: number
  earnedCents: number
  last30Cents: number
  prev30Cents: number
  firstAt: number | null
  weeks: number[] // the weeks (counted from 1970) in which they submitted something, newest first
}

/** How many weeks in a row they have submitted something. The current week does not break it until it is over. */
export function weeklyStreak(weeks: number[], now = nowSec()): { streak: number; thisWeek: boolean; best: number } {
  const set = new Set(weeks)
  const cur = Math.floor(now / 604800)
  const thisWeek = set.has(cur)
  let streak = 0
  for (let w = thisWeek ? cur : cur - 1; set.has(w); w--) streak++
  let best = 0
  let run = 0
  const sorted = [...set].sort((a, b) => a - b)
  sorted.forEach((w, i) => {
    run = i > 0 && sorted[i - 1] === w - 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return { streak, thisWeek, best }
}

/** "Trusted": enough approved clips, and almost all of what was reviewed was approved. Shown, never used to pay differently. */
export const isTrusted = (s: Pick<CreatorStats, 'approved' | 'rejected'>) => s.approved >= 10 && s.approved / Math.max(1, s.approved + s.rejected) >= 0.9

/** What the last 30 days suggest for the next 30, and how that compares with the 30 before. Plain arithmetic, no promise. */
export function forecast(s: Pick<CreatorStats, 'last30Cents' | 'prev30Cents'>) {
  const next = s.last30Cents
  const change = s.prev30Cents > 0 ? Math.round(((s.last30Cents - s.prev30Cents) / s.prev30Cents) * 100) : null
  return { next, change }
}

// ---------- the milestones worth a party, in dollars earned in total ----------
export const EARNING_MILESTONES = [10_000, 50_000, 100_000, 500_000, 1_000_000] as const // cents: $100, $500, $1,000, $5,000, $10,000
export const passedEarning = (cents: number) => EARNING_MILESTONES.filter((m) => cents >= m).at(-1) ?? 0
