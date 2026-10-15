// Discord's permission rules, with no outside code so they can be tested on their own.

// Discord permission bits we care about
export const bit = (n: number) => BigInt(1) << BigInt(n)
export const ZERO = BigInt(0)
export const ADMIN = bit(3)
export const MANAGE_CHANNELS = bit(4)
export const VIEW = bit(10)
export const SEND = bit(11)
export const EMBED = bit(14)
export const MANAGE_ROLES = bit(28)

export type Overwrite = { id: string; type: 0 | 1; allow: string; deny: string }
export type Role = { id: string; name: string; position: number; permissions: string; managed?: boolean }
export type Chan = { id: string; guild_id?: string; type: number; name?: string; permission_overwrites?: Overwrite[] }

/** What the bot may do in one channel: Discord's own rule, in order (server roles, then @everyone's overwrite, then role overwrites, then the bot's own). */
export function effective(base: bigint, c: Chan, guildId: string, botId: string, botRoles: string[]) {
  if (base & ADMIN) return ~ZERO
  const ow = c.permission_overwrites ?? []
  let p = base
  const everyone = ow.find((o) => o.type === 0 && o.id === guildId)
  if (everyone) p = (p & ~BigInt(everyone.deny)) | BigInt(everyone.allow)
  let allow = ZERO
  let deny = ZERO
  for (const o of ow) if (o.type === 0 && botRoles.includes(o.id)) (allow |= BigInt(o.allow)), (deny |= BigInt(o.deny))
  p = (p & ~deny) | allow
  const me = ow.find((o) => o.type === 1 && o.id === botId)
  if (me) p = (p & ~BigInt(me.deny)) | BigInt(me.allow)
  return p
}

