// Registers the bot's slash commands with Discord. The owner runs this (the same as the "Register commands" button on the Discord
// page of the owner dashboard). Nothing else ever registers commands.
//
//   DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... node scripts/discord-register-commands.mjs
//
// With DISCORD_GUILD_ID the commands appear in that server at once; without it they go to every server (can take up to an hour).
// --dry prints what would be sent and sends nothing. Needs Node 22.18 or newer (it reads the TypeScript list directly).
import { registerHooks } from 'node:module'

// the site's files import each other without the .ts ending; let Node find them
registerHooks({
  resolve(spec, ctx, next) {
    try {
      return next(spec, ctx)
    } catch (e) {
      if (spec.startsWith('.') && !/\.\w+$/.test(spec)) return next(`${spec}.ts`, ctx)
      throw e
    }
  },
})

const { COMMANDS } = await import('../lib/discord/command-defs.ts')
const dry = process.argv.includes('--dry')
console.log(`${COMMANDS.length} commands: ${COMMANDS.map((c) => `/${c.name}`).join(' ')}`)
if (dry) {
  console.log(JSON.stringify(COMMANDS, null, 2))
  process.exit(0)
}
const appId = process.env.DISCORD_APP_ID?.trim()
const token = process.env.DISCORD_BOT_TOKEN?.trim()
const guild = process.env.DISCORD_GUILD_ID?.trim()
if (!appId || !token) {
  console.error('Set DISCORD_APP_ID and DISCORD_BOT_TOKEN (the same values as in Cloudflare). DISCORD_GUILD_ID is optional.')
  process.exit(1)
}
const url = `https://discord.com/api/v10/applications/${appId}${guild ? `/guilds/${guild}` : ''}/commands`
const res = await fetch(url, { method: 'PUT', headers: { authorization: `Bot ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(COMMANDS) })
const body = await res.text()
if (!res.ok) {
  console.error(`Discord refused the commands (${res.status}): ${body.slice(0, 2000)}`)
  process.exit(1)
}
console.log(`Registered ${JSON.parse(body).length} commands ${guild ? 'in the server (they appear at once)' : 'everywhere (can take up to an hour)'}.`)
