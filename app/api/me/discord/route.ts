import { z } from 'zod'
import { botReady } from '@/lib/discord/api'
import { getDiscordConfig } from '@/lib/discord/config'
import { discordIdFor, dmEnabled, makeLinkCode, setDmEnabled, unlinkDiscord } from '@/lib/discord/link'
import { syncRoles } from '@/lib/discord/roles'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** Whether this account is linked to Discord, and whether the bot may message them. */
export const GET = route(async () => {
  const user = await requireUser()
  const [id, on, ready, cfg] = await Promise.all([discordIdFor(user.id), dmEnabled(user.id), botReady(), getDiscordConfig()])
  return json({ linked: Boolean(id), dm: on, botReady: ready, serverConfigured: Boolean(cfg.guildId) })
})

const schema = z.discriminatedUnion('action', [z.object({ action: z.literal('code') }), z.object({ action: z.literal('unlink') }), z.object({ action: z.literal('dm'), on: z.boolean() }), z.object({ action: z.literal('sync') })])

export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'discord-link', max: 20, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 512))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const a = parsed.data
  if (a.action === 'code') return json({ ok: true, ...(await makeLinkCode(user.id)) })
  if (a.action === 'unlink') {
    await unlinkDiscord(user.id)
    return json({ ok: true })
  }
  if (a.action === 'sync') {
    const r = await syncRoles(user.id)
    return json({ ok: r.ok, added: r.added, removed: r.removed, note: r.note })
  }
  await setDmEnabled(user.id, a.on)
  return json({ ok: true })
})
