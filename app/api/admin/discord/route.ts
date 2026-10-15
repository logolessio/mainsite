import { z } from 'zod'
import { audit } from '@/lib/chain'
import { db, setting } from '@/lib/db'
import { botReady, discord, postMessage, registerCommands, WHITE } from '@/lib/discord/api'
import { getStartedMessage, rulesMessage, siteMessage, supportPanel } from '@/lib/discord/panels'
import { publicStats } from '@/lib/public-stats'
import { COMMANDS } from '@/lib/discord/commands'
import { clean, getDiscordConfig, saveDiscordConfig } from '@/lib/discord/config'
import { logToDiscord, refreshStatus } from '@/lib/discord/outbound'
import { syncRoles } from '@/lib/discord/roles'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

/** Permissions the bot asks for when it is added: see channels, send messages, embed links, read history, manage roles and manage channels (for tickets). */
const PERMISSIONS = 268520464

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), config: z.unknown() }),
  z.object({ action: z.literal('register') }),
  z.object({ action: z.literal('test') }),
  z.object({ action: z.literal('post'), what: z.enum(['getStarted', 'rules', 'site', 'support', 'status']) }),
  z.object({ action: z.literal('sync') }),
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
    has: { token: Boolean(token), appId: Boolean(appId), key: Boolean(key) },
    ready: await botReady(),
    bot,
    cfg,
    linked: (linked?.n ?? 0) + (byLogin?.n ?? 0),
    commands: COMMANDS.length,
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
    const res = await postMessage(channel, { embeds: [{ title: 'The logoless bot is working', description: 'This is a test from the admin area.', color: WHITE }] })
    if (!res.ok) throw new HttpError(502, `Discord would not take it (${res.status}). Does the bot have permission in that channel?`)
    return json({ ok: true })
  }
  if (a.action === 'post') {
    const ok = {
      getStarted: { id: cfg.channels.getStarted, label: 'get-started', msg: () => getStartedMessage(cfg) },
      rules: { id: cfg.channels.rules, label: 'rules', msg: () => rulesMessage(cfg) },
      site: { id: cfg.channels.site, label: 'site', msg: async () => siteMessage(await publicStats()) },
      support: { id: cfg.channels.support, label: 'support', msg: () => supportPanel() },
      status: { id: cfg.channels.status, label: 'status', msg: () => null },
    }[a.what]
    if (!ok.id) throw new HttpError(409, `Set the ${ok.label} channel first, and save.`)
    if (a.what === 'status') {
      if (!(await refreshStatus(true))) throw new HttpError(502, 'Discord would not take it. Does the bot have permission in that channel?')
      return json({ ok: true })
    }
    const res = await postMessage(ok.id, (await ok.msg())!)
    if (!res.ok) throw new HttpError(502, `Discord would not take it (${res.status}). Does the bot have permission in that channel?`)
    await audit(actor, 'discord.post', a.what, null, ip)
    return json({ ok: true })
  }
  // sync: refresh the roles of linked members, a batch at a time
  const d = await db()
  const rows = (await d.prepare("SELECT value FROM settings WHERE key LIKE 'discord-user:%' LIMIT 60").all<{ value: string }>()).results
  let changed = 0
  for (const r of rows) {
    const s = await syncRoles(r.value)
    if (s.ok && (s.added.length || s.removed.length)) changed++
  }
  await logToDiscord(`🔄 Roles refreshed by ${admin.email}: ${changed} of ${rows.length} changed.`)
  await audit(actor, 'discord.sync', null, `${rows.length} members, ${changed} changed`, ip)
  return json({ ok: true, checked: rows.length, changed })
})
