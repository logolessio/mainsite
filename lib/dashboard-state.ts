import { db, nowSec } from './db'
import { featureState } from './features'
import { creatorSetup } from './setup-steps'

/**
 * Small things the creator dashboard remembers per person: when they last opened their recap, and which optional pages they took
 * out of the sidebar. One row per person in dashboard_state.
 */
export const OPTIONAL_PAGES = ['discord'] as const
export type OptionalPage = (typeof OPTIONAL_PAGES)[number]

/** Recap appears once there is something worth looking back on. */
export const RECAP_MIN = { approvedClips: 1, views: 1000 }
/** It glows again when it has not been opened for this long. */
export const RECAP_GLOW_AFTER_SEC = 90 * 86400

type Row = { recap_seen_at: number | null; nav_hidden: string }

export async function dashState(userId: string): Promise<{ recapSeenAt: number | null; hidden: OptionalPage[] }> {
  try {
    const d = await db()
    const r = await d.prepare('SELECT recap_seen_at, nav_hidden FROM dashboard_state WHERE user_id = ?1').bind(userId).first<Row>()
    let hidden: OptionalPage[] = []
    try {
      const list = JSON.parse(r?.nav_hidden ?? '[]') as unknown
      hidden = Array.isArray(list) ? (list.filter((x) => (OPTIONAL_PAGES as readonly unknown[]).includes(x)) as OptionalPage[]) : []
    } catch {
      hidden = []
    }
    return { recapSeenAt: r?.recap_seen_at ?? null, hidden }
  } catch {
    return { recapSeenAt: null, hidden: [] } // the table is not there yet
  }
}

export async function markRecapSeen(userId: string) {
  const d = await db()
  const t = nowSec()
  await d
    .prepare('INSERT INTO dashboard_state (user_id, recap_seen_at, updated_at) VALUES (?1, ?2, ?2) ON CONFLICT(user_id) DO UPDATE SET recap_seen_at = excluded.recap_seen_at, updated_at = excluded.updated_at')
    .bind(userId, t)
    .run()
}

export async function setPageHidden(userId: string, page: OptionalPage, hidden: boolean) {
  const cur = (await dashState(userId)).hidden.filter((p) => p !== page)
  const next = hidden ? [...cur, page] : cur
  const d = await db()
  await d
    .prepare('INSERT INTO dashboard_state (user_id, nav_hidden, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(user_id) DO UPDATE SET nav_hidden = excluded.nav_hidden, updated_at = excluded.updated_at')
    .bind(userId, JSON.stringify(next), nowSec())
    .run()
  return next
}

/** Set-up is done when every needed step is (getting paid the first time is a milestone, not set-up, so it does not count). */
async function onboarded(user: { id: string; email: string }) {
  const steps = await creatorSetup(user)
  return steps.every((s) => s.optional || s.id === 'paid' || s.done)
}

async function enoughForRecap(userId: string) {
  const d = await db()
  const r = await d
    .prepare("SELECT COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved, COALESCE(SUM(views_verified), 0) AS views FROM submissions WHERE user_id = ?1")
    .bind(userId)
    .first<{ approved: number; views: number }>()
  return (r?.approved ?? 0) >= RECAP_MIN.approvedClips && (r?.views ?? 0) >= RECAP_MIN.views
}

export type SidebarExtras = {
  /** null = no Recap in the sidebar (switched off, set-up not finished, or not enough yet). */
  recap: { gold: boolean } | null
  /** Show the Discord page in the sidebar. */
  discord: boolean
  /** The Discord page exists at all (so Settings can offer to put it back). */
  discordAvailable: boolean
}

/** What the creator sidebar adds beyond its usual pages. Never throws: on any problem the extras are simply left out. */
export async function sidebarExtras(user: { id: string; email: string }): Promise<SidebarExtras> {
  try {
    const { on } = await featureState()
    const state = await dashState(user.id)
    const discordAvailable = on['discord-page'] === true
    let recap: SidebarExtras['recap'] = null
    if (on.recap && on['recap-sidebar']) {
      const [ready, enough] = await Promise.all([onboarded(user), enoughForRecap(user.id)])
      if (ready && enough) recap = { gold: state.recapSeenAt === null || nowSec() - state.recapSeenAt >= RECAP_GLOW_AFTER_SEC }
    }
    return { recap, discord: discordAvailable && !state.hidden.includes('discord'), discordAvailable }
  } catch {
    return { recap: null, discord: false, discordAvailable: false }
  }
}
