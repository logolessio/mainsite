import { clipAction } from './admin-ops'
import { db, nowSec, setting } from './db'
import { notifyAdmins } from './notify'
import { getSetting } from './settings'
import { type Lookup, lookupViews } from './views-fetch'

/**
 * Looks at every approved submission on a live campaign again, about every two hours, and pays for views that have gone up.
 * It stops by itself when a campaign ends, because only live campaigns are looked at. The cron in wrangler.jsonc starts a run every
 * half hour; each submission is only looked at again once it is "due" (a little under two hours since its last look), so the
 * load is spread out and nothing is checked twice in a row.
 *
 * Money safety, so a wrong number from a platform cannot pay the wrong amount:
 *  - views can only go up here: a lower number is ignored
 *  - a sudden jump (more than three times what was already verified, and over 20,000) is not paid: a person is asked to look
 *  - a video posted before the campaign went live is not paid: a person is asked to look
 *  - the money goes through the same step as a person setting the views, so budgets, caps and the campaign ending all apply
 *  - the whole thing can be paused from Platform settings
 */
const SYSTEM = { id: null, email: 'system:view-check' }
const DUE_AFTER = 100 * 60
const LOCK_FOR = 10 * 60
const BUDGET_MS = 24_000
const PER_RUN = 150

type State = { at: number; seen: number | null; fails: number; note?: string; flag?: number }
export type Summary = { at: number; checked: number; updated: number; unchanged: number; flagged: number; failed: number; manual: number; skipped?: 'paused' | 'busy' }

const stateKey = (id: string) => `viewscan:${id}`
const put = async (key: string, value: string) => {
  const d = await db()
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(key, value, nowSec()).run()
}

async function lock(): Promise<boolean> {
  const d = await db()
  const now = nowSec()
  const r = await d
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES ('viewscan:lock', ?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at WHERE CAST(settings.value AS INTEGER) < ?3")
    .bind(String(now), now, now - LOCK_FOR)
    .run()
  return r.meta.changes === 1
}

export async function lastScan(): Promise<Summary | null> {
  try {
    const d = await db()
    const r = await d.prepare("SELECT value FROM settings WHERE key = 'viewscan:last'").first<{ value: string }>()
    return r ? (JSON.parse(r.value) as Summary) : null
  } catch {
    return null
  }
}

type Row = { id: string; platform: string; url: string; views_verified: number; campaign_id: string; title: string; launched_at: number | null; state: string | null }

/** Looks at everything that is due. `fake` is for tests on a developer machine only: it stands in for the platforms. */
export async function rescanViews(o: { force?: boolean; limit?: number; fake?: Record<string, number | 'gone'> } = {}): Promise<Summary> {
  const started = Date.now()
  const out: Summary = { at: nowSec(), checked: 0, updated: 0, unchanged: 0, flagged: 0, failed: 0, manual: 0 }
  if (!o.force && (await getSetting('views_scan_paused')) === '1') return { ...out, skipped: 'paused' }
  if (!(await lock())) return { ...out, skipped: 'busy' }
  try {
    const d = await db()
    const youtubeKey = await setting('YOUTUBE_API_KEY')
    const now = nowSec()
    const rows = (
      await d
        .prepare(
          `SELECT s.id, s.platform, s.url, s.views_verified, c.id AS campaign_id, c.title, c.launched_at, v.value AS state
           FROM submissions s JOIN campaigns c ON c.id = s.campaign_id JOIN users u ON u.id = s.user_id
           LEFT JOIN settings v ON v.key = 'viewscan:' || s.id
           WHERE s.status = 'approved' AND c.status = 'live' AND c.id NOT LIKE 'mock-%' AND u.status = 'active'
             AND COALESCE(CAST(json_extract(v.value, '$.at') AS INTEGER), 0) < ?1
           ORDER BY COALESCE(CAST(json_extract(v.value, '$.at') AS INTEGER), 0) ASC LIMIT ?2`,
        )
        .bind(o.force ? now + 1 : now - DUE_AFTER, o.limit ?? PER_RUN)
        .all<Row>()
    ).results

    const one = async (r: Row) => {
      let st: State = { at: now, seen: null, fails: 0 }
      try {
        st = { ...st, ...(r.state ? (JSON.parse(r.state) as State) : {}), at: now }
      } catch {
        /* a broken note: start again */
      }
      out.checked++
      if (r.platform === 'instagram') {
        out.manual++
        st.note = 'Checked by our team'
        return put(stateKey(r.id), JSON.stringify(st))
      }
      let res: Lookup
      const fake = o.fake?.[r.url]
      if (fake !== undefined && process.env.NODE_ENV !== 'production') res = fake === 'gone' ? { ok: false, gone: true, why: 'test: gone' } : { ok: true, views: fake, postedAt: null }
      else res = await lookupViews(r.platform, r.url, { youtubeKey })

      if (!res.ok) {
        out.failed++
        st.note = res.why
        if (res.gone) {
          st.fails++
          if (st.fails >= 3) await notifyAdmins({ title: `A video seems to be gone: ${r.title}`, body: 'It has been missing for three checks in a row. Open it and decide whether it should keep earning.', href: '/admin/submissions', dedupe: `viewscan-gone:${r.id}` })
        }
        return put(stateKey(r.id), JSON.stringify(st))
      }
      st.fails = 0
      st.seen = res.views
      st.note = undefined

      const verified = r.views_verified
      if (res.views <= verified) {
        out.unchanged++
        return put(stateKey(r.id), JSON.stringify(st))
      }
      const before = verified === 0 && res.postedAt !== null && r.launched_at !== null && res.postedAt < r.launched_at - 3600
      const jump = verified > 0 ? res.views - verified > Math.max(20_000, verified * 3) : res.views > 100_000
      if (before || jump) {
        out.flagged++
        st.flag = res.views
        st.note = before ? 'Posted before the campaign started' : 'Unusual jump, waiting for a person'
        await notifyAdmins({
          title: before ? `Posted before the campaign: ${r.title}` : `Unusual jump in views: ${r.title}`,
          body: before ? 'The video is older than the campaign. A person should decide if it counts.' : `${verified.toLocaleString()} to ${res.views.toLocaleString()} views. Not paid until a person looks.`,
          href: '/admin/submissions',
          dedupe: `viewscan-flag:${r.id}:${before ? 'old' : Math.floor(res.views / 10_000)}`,
        })
        return put(stateKey(r.id), JSON.stringify(st))
      }
      try {
        await clipAction(SYSTEM, null, r.id, { action: 'views', views: res.views })
        out.updated++
      } catch (e) {
        out.failed++
        st.note = e instanceof Error ? e.message.slice(0, 120) : 'Could not update'
      }
      return put(stateKey(r.id), JSON.stringify(st))
    }

    // four at a time, and stop when the time budget is used: whatever is left is still due at the next run
    let next = 0
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (next < rows.length && Date.now() - started < BUDGET_MS) {
          const r = rows[next++]
          try {
            await one(r)
          } catch {
            out.failed++
          }
        }
      }),
    )
    await put('viewscan:last', JSON.stringify(out))
    return out
  } finally {
    await put('viewscan:lock', '0').catch(() => {})
  }
}

/** If the scheduled job has not run for a few hours (for example it is not set up yet), the next visitor to the site starts one. */
let askedAt = 0
export async function lazyRescan(): Promise<void> {
  if (Date.now() - askedAt < 5 * 60_000) return // each server instance asks at most every five minutes
  askedAt = Date.now()
  try {
    const last = await lastScan()
    if (last && nowSec() - last.at < 3 * 3600) return
    await rescanViews()
  } catch {
    /* a missed check is picked up by the next one */
  }
}
