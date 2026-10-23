import { z } from 'zod'
import { audit } from '@/lib/chain'
import { db, setting } from '@/lib/db'
import { botReady, discord, explainDiscord, postMessage, registerCommands, sendDm } from '@/lib/discord/api'
import { done } from '@/lib/discord/cards'
import { discordIdFor } from '@/lib/discord/link'
import { SAMPLE_BY_ID, sampleList } from '@/lib/discord/samples'
import { oauthClient } from '@/lib/discord/connect'
import { checkAccess } from '@/lib/discord/diagnose'
import { getStartedMessage, rulesMessage, siteMessage, supportPanel } from '@/lib/discord/panels'
import { launchNotice } from '@/lib/discord/notice'
import { publicStats } from '@/lib/public-stats'
import { COMMANDS } from '@/lib/discord/commands'
import { clean, getDiscordConfig, saveDiscordConfig } from '@/lib/discord/config'
import { logToDiscord, refreshStatus } from '@/lib/discord/outbound'
import { syncRoles } from '@/lib/discord/roles'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'
import { featureOn } from '@/lib/features'
import { lastTick } from '@/lib/discord/tick'
import { audience, pitchLine } from '@/lib/discord/audience'
import { heldSignups, preCounts } from '@/lib/prelaunch'

/** Permissions the bot asks for when it is added: see channels, send messages, embed links, read history, manage roles and manage channels (for tickets). */
const PERMISSIONS = 268520464

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), config: z.unknown() }),
  z.object({ action: z.literal('register') }),
  z.object({ action: z.literal('check') }),
  z.object({ action: z.literal('test') }),
  z.object({ action: z.literal('sample'), id: z.string().max(60), to: z.enum(['logs', 'me']).default('logs'), channel: z.string().max(30).optional() }),
  z.object({ action: z.literal('post'), what: z.enum(['getStarted', 'rules', 'site', 'support', 'status']) }),
  z.object({ action: z.literal('sync') }),
  z.object({ action: z.literal('artists') }),
  z.object({ action: z.literal('cards') }),
  z.object({ action: z.literal('tick') }),
  z.object({ action: z.literal('make-roles') }),
  z.object({ action: z.literal('make-places') }),
  z.object({ action: z.literal('make-community') }),
  z.object({ action: z.literal('lock-community') }),
  z.object({ action: z.literal('prelaunch-decide'), userId: z.string().min(8).max(64), approve: z.boolean() }),
  z.object({ action: z.literal('welcome-me') }),
])

/** What is set up, and the buttons that make it work. */
export const GET = route(async () => {
  await requireAdmin()
  const [token, appId, key, cfg] = await Promise.all([setting('DISCORD_BOT_TOKEN'), setting('DISCORD_APP_ID'), setting('DISCORD_PUBLIC_KEY'), getDiscordConfig()])
  const d = await db()
  const linked = await d.prepare("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'discord-user:%'").first<{ n: number }>()
  const byLogin = await d.prepare("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'discord-email:%'").first<{ n: number }>()
  let bot: string | null = null
  if (token) bot = (await discord<{ username: string }>('GET', '/users/@me')).json?.username ?? null
  return json({
    has: { token: Boolean(token), appId: Boolean(appId), key: Boolean(key), secret: Boolean(await oauthClient()) },
    ready: await botReady(),
    bot,
    cfg,
    linked: (linked?.n ?? 0) + (byLogin?.n ?? 0),
    audience: await audience().then(async (a) => ({ ...a, line: pitchLine(a) })).catch(() => null),
    prelaunch: { ...(await preCounts()), held: await heldSignups(), page: 'https://beta.logoless.io/onboarding' },
    commands: COMMANDS.length,
    lastTick: await lastTick(),
    samples: sampleList(),
    endpoint: 'https://logoless.io/api/discord/interactions',
    invite: appId ? `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot%20applications.commands&permissions=${PERMISSIONS}` : null,
  })
})

export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-discord', max: 30, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 16 * 1024))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const a = parsed.data
  const actor = { id: admin.id, email: admin.email }
  const ip = await ipHash(req)

  if (a.action === 'save') {
    const cfg = await saveDiscordConfig(clean(a.config))
    await audit(actor, 'discord.config', null, null, ip)
    return json({ ok: true, cfg })
  }
  if (!(await botReady())) throw new HttpError(409, 'Add DISCORD_APP_ID, DISCORD_PUBLIC_KEY and DISCORD_BOT_TOKEN in Cloudflare first.')
  const cfg = await getDiscordConfig()

  if (a.action === 'register') {
    const appId = (await setting('DISCORD_APP_ID'))!
    const res = await registerCommands(appId.trim(), cfg.guildId || null, COMMANDS)
    if (!res.ok) throw new HttpError(502, `Discord refused the commands (${res.status}). Check the application ID and the bot token.`)
    await audit(actor, 'discord.register', null, cfg.guildId ? 'server' : 'global', ip)
    return json({ ok: true, count: COMMANDS.length, where: cfg.guildId ? 'your server (instant)' : 'every server (can take up to an hour)' })
  }
  if (a.action === 'test') {
    const channel = cfg.channels.news || cfg.channels.logs
    if (!channel) throw new HttpError(409, 'Pick the news channel first.')
    const res = await postMessage(channel, done('This is a test from the admin area.', 'The bot is working'))
    if (!res.ok) throw new HttpError(502, explainDiscord(res, 'the news channel'))
    return json({ ok: true })
  }
  if (a.action === 'sample') {
    const sample = SAMPLE_BY_ID[a.id]
    if (!sample) throw new HttpError(404, 'There is no sample by that name.')
    const message = sample.build()
    if (a.to === 'me') {
      const did = await discordIdFor(admin.id)
      if (!did) throw new HttpError(409, 'Link your own Discord first (Settings, Connect Discord), then I can message you.')
      if (!(await sendDm(did, message))) throw new HttpError(502, 'Discord would not take the direct message. Check that you allow messages from server members.')
      return json({ ok: true, where: 'your direct messages' })
    }
    const channel = (a.channel && /^\d{15,22}$/.test(a.channel) ? a.channel : '') || cfg.channels.logs || cfg.channels.news
    if (!channel) throw new HttpError(409, 'Set the team log channel (or the news channel) first, and save.')
    const res = await postMessage(channel, message)
    if (!res.ok) throw new HttpError(502, explainDiscord(res, 'that channel'))
    return json({ ok: true, where: 'the team log channel' })
  }
  if (a.action === 'check') {
    const lines = await checkAccess(cfg)
    return json({ ok: true, good: lines.every((l) => l.ok), lines })
  }
  if (a.action === 'post') {
    const ok = {
      getStarted: { id: cfg.channels.getStarted, label: 'get-started', msg: async () => getStartedMessage(cfg, await featureOn('discord-onboarding'), await launchNotice()) },
      rules: { id: cfg.channels.rules, label: 'rules', msg: () => rulesMessage(cfg) },
      site: { id: cfg.channels.site, label: 'site', msg: async () => siteMessage(await publicStats(), (await launchNotice()) ? pitchLine(await audience()) : undefined) },
      support: { id: cfg.channels.support, label: 'support', msg: () => supportPanel() },
      status: { id: cfg.channels.status, label: 'status', msg: () => null },
    }[a.what]
    if (!ok.id) throw new HttpError(409, `Set the ${ok.label} channel first, and save.`)
    if (a.what === 'status') {
      if (!(await refreshStatus(true))) throw new HttpError(502, 'Discord would not take the status card. Press "Check the bot\'s access" to see what is missing in that channel.')
      return json({ ok: true })
    }
    const res = await postMessage(ok.id, (await ok.msg())!)
    if (!res.ok) throw new HttpError(502, explainDiscord(res, `the ${ok.label} channel`))
    await audit(actor, 'discord.post', a.what, null, ip)
    return json({ ok: true })
  }
  if (a.action === 'tick') {
    // one run of the 30-second loop now, whatever the switches say (the owner asked for it)
    const { discordTick } = await import('@/lib/discord/tick')
    const r = await discordTick({ force: true })
    await audit(actor, 'discord.tick', null, r.skipped ?? null, ip)
    return json({ ok: true, ...r })
  }
  if (a.action === 'welcome-me') {
    // sends the owner the next steps and the rundown, to see them (again) as a member would
    const { welcomeOnce } = await import('@/lib/discord/welcome')
    const r = await welcomeOnce(admin.id, { force: true, skipFollowUp: true })
    if (!r) throw new HttpError(409, 'Link your own Discord first (Settings, Connect Discord), and finish onboarding.')
    if (!r.dm) throw new HttpError(502, 'Discord would not take the direct message. Check that you allow messages from server members.')
    return json({ ok: true })
  }
  if (a.action === 'make-roles' || a.action === 'make-places') {
    // Makes what is missing in the server, and saves the new IDs. It never changes or deletes anything that is already there:
    // only empty boxes are filled. The owner presses the button; nothing calls this by itself.
    if (!cfg.guildId) throw new HttpError(409, 'Save your server ID first.')
    const next = structuredClone(cfg)
    const made: string[] = []
    if (a.action === 'make-roles') {
      const { ROLE_NAMES } = await import('@/lib/discord/roles')
      for (const r of ROLE_NAMES) {
        if (next.roles[r.key]) continue
        const res = await discord<{ id: string }>('POST', `/guilds/${cfg.guildId}/roles`, { name: r.name, permissions: '0', hoist: r.key !== 'linked', mentionable: false })
        if (!res.ok || !res.json?.id) throw new HttpError(502, explainDiscord(res, 'the server'))
        next.roles[r.key] = res.json.id
        made.push(r.name)
      }
    } else {
      const me = await discord<{ id: string }>('GET', '/users/@me')
      if (!me.ok || !me.json) throw new HttpError(502, explainDiscord(me))
      const bot = { id: me.json.id, type: 1, allow: String(1024 + 2048 + 16384 + 65536 + 16), deny: '0' }
      const staff = cfg.roles.staff ? [{ id: cfg.roles.staff, type: 0, allow: String(1024 + 2048 + 65536), deny: '0' }] : []
      const hidden = [{ id: cfg.guildId, type: 0, allow: '0', deny: '1024' }, bot, ...staff]
      const readOnly = [{ id: cfg.guildId, type: 0, allow: '0', deny: '2048' }, bot]
      const make = async (name: string, type: 0 | 4, overwrites: object[], parent?: string) => {
        const res = await discord<{ id: string }>('POST', `/guilds/${cfg.guildId}/channels`, { name, type, permission_overwrites: overwrites, ...(parent ? { parent_id: parent } : {}) })
        if (!res.ok || !res.json?.id) throw new HttpError(502, explainDiscord(res, 'the server'))
        made.push(type === 4 ? `${name} (category)` : `#${name}`)
        return res.json.id
      }
      if (!next.artistsCategory) next.artistsCategory = await make('Artists', 4, readOnly)
      if (!next.inactiveCategory) next.inactiveCategory = await make('Inactive', 4, hidden)
      if (!next.ticketCategory) next.ticketCategory = await make('Tickets', 4, hidden)
      if (!next.channels.payouts) next.channels.payouts = await make('payouts', 0, readOnly)
      if (!next.channels.submissions) next.channels.submissions = await make('submissions', 0, readOnly)
    }
    const savedCfg = await saveDiscordConfig(next)
    await audit(actor, `discord.${a.action}`, null, made.join(', ') || 'nothing missing', ip)
    return json({ ok: true, made, cfg: savedCfg })
  }
  if (a.action === 'make-community') {
    // general chat, introductions, help, ideas, the command channel, two voice lounges and the private team channels: only what is missing, by name
    if (!cfg.guildId) throw new HttpError(409, 'Save your server ID first.')
    const { buildCommunity } = await import('@/lib/discord/server-build')
    let r: { made: string[]; skipped: string[] }
    try {
      r = await buildCommunity(cfg)
    } catch (e) {
      throw new HttpError(502, e instanceof Error ? e.message : 'Discord would not make the channels.')
    }
    await audit(actor, 'discord.make-community', null, r.made.join(', ') || 'nothing missing', ip)
    return json({ ok: true, ...r })
  }
  if (a.action === 'lock-community') {
    if (!cfg.guildId) throw new HttpError(409, 'Save your server ID first.')
    const { lockCommunity } = await import('@/lib/discord/server-build')
    try {
      const r = await lockCommunity(cfg)
      await audit(actor, 'discord.lock-community', null, r.locked.join(', ') || r.note || 'nothing', ip)
      return json({ ok: true, ...r })
    } catch (e) {
      throw new HttpError(502, e instanceof Error ? e.message : 'Discord would not change the channels.')
    }
  }
  if (a.action === 'prelaunch-decide') {
    // a sign-up that was held for a look: let it in (the role is given and they are told) or turn it down
    const { decidePre } = await import('@/lib/prelaunch')
    const { tellDecision } = await import('@/lib/discord/prelaunch')
    const s = await decidePre(a.userId, a.approve)
    if (!s) throw new HttpError(404, 'That sign-up was not found.')
    await tellDecision(a.userId, a.approve, s.n ?? null)
    await audit(actor, `discord.prelaunch-${a.approve ? 'approve' : 'deny'}`, a.userId, s.flags.join('; ') || 'no flags', ip)
    return json({ ok: true, n: s.n ?? null })
  }
  if (a.action === 'artists') {
    const { syncAllArtists } = await import('@/lib/discord/campaigns')
    const r = await syncAllArtists()
    await audit(actor, 'discord.artists', null, `${r.artists} artists`, ip)
    return json({ ok: true, ...r })
  }
  if (a.action === 'cards') {
    // every live campaign gets its artist channel and its live card (made now if missing)
    const { refreshCampaignCard } = await import('@/lib/discord/campaigns')
    const d0 = await db()
    const live = (await d0.prepare("SELECT id FROM campaigns WHERE status = 'live' AND id NOT LIKE 'mock-%' LIMIT 25").all<{ id: string }>()).results
    let done = 0
    for (const c of live) if (await refreshCampaignCard(c.id, true)) done++
    await audit(actor, 'discord.cards', null, `${done} of ${live.length}`, ip)
    return json({ ok: true, live: live.length, done })
  }
  // sync: refresh the roles of linked members, a batch at a time
  const d = await db()
  const rows = (await d.prepare("SELECT value FROM settings WHERE key LIKE 'discord-user:%' LIMIT 60").all<{ value: string }>()).results
  let changed = 0
  for (const r of rows) {
    const s = await syncRoles(r.value)
    if (s.ok && (s.added.length || s.removed.length)) changed++
  }
  await logToDiscord(`Roles refreshed by ${admin.email}: ${changed} of ${rows.length} changed.`, 'spark')
  await audit(actor, 'discord.sync', null, `${rows.length} members, ${changed} changed`, ip)
  return json({ ok: true, checked: rows.length, changed })
})
