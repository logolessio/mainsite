import { db, nowSec } from '../db'
import { featureOn } from '../features'
import { launchView } from '../launch'
import { allSettings } from '../settings'
import { botReady, followUp, sendDm, siteUrl } from './api'
import { nextStepsCard, rundownDm, startReplyCard, type NextData, type StartState } from './cards-more'
import { preLaunchPanel } from './panels-new'
import { getDiscordConfig } from './config'
import { discordIdFor, userByDiscord } from './link'
import { memberKinds, syncRoles } from './roles'

/**
 * The one-button start in #get-started.
 *  1. The member presses Get started. The bot answers with a link only they can see, and keeps the press for 14 minutes (Discord
 *     lets a bot add to its answer for 15). The link is the site's sign-up with ?ref=discord, which ends on /onboarding/discord.
 *  2. Once the account exists and Discord is linked (in whichever order), `welcomeOnce` runs, once per person: a message only
 *     they can see in #get-started with what to do next (if their press is still fresh), a direct message with the full rundown,
 *     and their roles.
 * A message only one person can see can only ever be an answer to something they pressed, which is why step 1 is a button and
 * not a plain link.
 */
const FRESH = 14 * 60
const pressKey = (discordId: string) => `discord:start:${discordId}`
const doneKey = (userId: string) => `discord:welcomed-next:${userId}`

export const startUrl = () => `${siteUrl}/onboarding?ref=discord`

const put = async (key: string, value: string) => {
  const d = await db()
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(key, value, nowSec()).run()
}
const get = async (key: string) => (await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>())?.value ?? null

/** Keeps a job running after the answer has gone back to Discord (on Cloudflare a loose promise would be cut off). */
async function background(p: Promise<unknown>) {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    getCloudflareContext().ctx.waitUntil(p)
  } catch {
    void p
  }
}

const onboarded = async (userId: string) => Boolean(await get(`onboarded:${userId}`))

async function nextData(userId: string): Promise<NextData> {
  const d = await db()
  const cfg = await getDiscordConfig()
  const p = await d.prepare("SELECT COALESCE(p.display_name, u.name, p.handle, 'there') AS name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1").bind(userId).first<{ name: string }>()
  const live = await d.prepare("SELECT COUNT(*) AS n FROM campaigns WHERE status = 'live' AND id NOT LIKE 'mock-%'").first<{ n: number }>()
  const k = await memberKinds(userId)
  return { name: p?.name || 'there', guildId: cfg.guildId, campaignsChannel: cfg.channels.newCampaigns || undefined, supportChannel: cfg.channels.support || undefined, brand: Boolean(k?.brand || k?.creator), live: live?.n ?? 0 }
}

/** The commands worth knowing, for the rundown, by kind of member. */
export function commandsFor(brand: boolean, developer: boolean): [string, string][] {
  const base: [string, string][] = brand
    ? [['brand', 'your campaigns, budget left and numbers'], ['stats', 'everything at a glance']]
    : [['campaigns', 'what is live right now'], ['submit', 'send your content to a campaign'], ['stats', 'your views and earnings'], ['balance', 'what you can withdraw'], ['payout', 'where your withdrawals are'], ['rank', 'your place on the leaderboard']]
  return [...base, ...(developer ? ([['dev', 'your apps and the docs']] as [string, string][]) : []), ['next', 'what to do next'], ['support', 'a private ticket with the team'], ['help', 'every command']]
}

/** Someone pressed Get started. */
export async function startPressed(a: { discordId: string; appId: string; token: string }) {
  await put(pressKey(a.discordId), JSON.stringify({ app: a.appId, token: a.token, at: nowSec() }))
  const userId = await userByDiscord(a.discordId)
  const state: StartState = !userId ? 'new' : (await onboarded(userId)) ? 'ready' : 'unfinished'
  // while the site is closed behind the launch page, its sign-up and onboarding pages cannot be opened: say when it opens and what to do here meanwhile
  const launch = launchView(await allSettings())
  if (launch.closed) {
    const { getPre } = await import('../prelaunch')
    const pre = userId ? await getPre(userId) : null
    return preLaunchPanel(launch.end, pre ? { n: pre.n ?? null, held: Boolean(pre.held && !pre.n) } : undefined)
  }
  if (state === 'ready' && userId) {
    // already set up: the next steps are the answer itself, and the rundown goes out if it never did
    await background(welcomeOnce(userId, { skipFollowUp: true }))
    return nextStepsCard(await nextData(userId))
  }
  return startReplyCard(state, startUrl())
}

/**
 * Account made and Discord linked: the next steps (only they can see it) and the rundown, once. Safe to call from anywhere and any
 * number of times; it does nothing until both are true, or when the feature is off on this address.
 */
export async function welcomeOnce(userId: string, o: { skipFollowUp?: boolean; force?: boolean } = {}): Promise<{ dm: boolean; followUp: boolean } | null> {
  try {
    if (!o.force && !(await featureOn('discord-onboarding'))) return null
    if (!(await botReady())) return null
    const discordId = await discordIdFor(userId)
    if (!discordId || !(await onboarded(userId))) return null
    const d = await db()
    const claim = await d.prepare("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, '1', ?2)").bind(doneKey(userId), nowSec()).run()
    if (claim.meta.changes !== 1 && !o.force) return null
    const n = await nextData(userId)
    const k = await memberKinds(userId)
    let shown = false
    if (!o.skipFollowUp) {
      const press = await get(pressKey(discordId))
      if (press) {
        try {
          const p = JSON.parse(press) as { app: string; token: string; at: number }
          if (nowSec() - p.at < FRESH) shown = await followUp(p.app, p.token, nextStepsCard(n))
        } catch {
          /* a broken row: the direct message still goes */
        }
        await d.prepare('DELETE FROM settings WHERE key = ?1').bind(pressKey(discordId)).run()
      }
    }
    const dm = await sendDm(discordId, rundownDm({ ...n, commands: commandsFor(n.brand, Boolean(k?.developer)) }))
    await syncRoles(userId).catch(() => null)
    return { dm, followUp: shown }
  } catch (e) {
    console.error('discord welcome failed', e instanceof Error ? e.message : e)
    return null
  }
}

/** What the Discord step of onboarding shows. */
export async function discordStepState(userId: string) {
  const [linked, done] = await Promise.all([discordIdFor(userId), get(doneKey(userId))])
  const cfg = await getDiscordConfig()
  return { linked: Boolean(linked), welcomed: Boolean(done), channelUrl: cfg.guildId && cfg.channels.getStarted ? `https://discord.com/channels/${cfg.guildId}/${cfg.channels.getStarted}` : cfg.guildId ? `https://discord.com/channels/${cfg.guildId}` : null }
}
