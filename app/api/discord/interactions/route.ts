import { getCloudflareContext } from '@opennextjs/cloudflare'
import { setting } from '@/lib/db'
import { editOriginal, type Message } from '@/lib/discord/api'
import { handleInteraction, type Interaction } from '@/lib/discord/commands'
import { verifyDiscordRequest } from '@/lib/discord/verify'
import { logEvent } from '@/lib/log'

/**
 * Where Discord sends every slash command, button press and form. Set this address as the "Interactions Endpoint URL" of the
 * bot in the Discord developer portal. Nothing is trusted until Discord's signature on the request checks out.
 */
export async function POST(req: Request) {
  const raw = await req.text()
  const key = await setting('DISCORD_PUBLIC_KEY')
  const ok = key ? await verifyDiscordRequest(key.trim(), req.headers.get('x-signature-ed25519') ?? '', req.headers.get('x-signature-timestamp') ?? '', raw) : false
  if (!ok) return new Response('invalid request signature', { status: 401 })

  let i: Interaction
  try {
    i = JSON.parse(raw) as Interaction
  } catch {
    return new Response('bad request', { status: 400 })
  }
  if (i.type === 1) return Response.json({ type: 1 }) // Discord's check that the address works

  // A command that needs more than three seconds answers "thinking" at once and finishes in the background.
  const defer = (work: () => Promise<Message>) => {
    const job = work()
      .then((m) => editOriginal(i.application_id, i.token, m))
      .catch(() => editOriginal(i.application_id, i.token, { content: 'Something went wrong. Please try again.' }))
    getCloudflareContext({ async: true })
      .then(({ ctx }) => ctx.waitUntil(job))
      .catch(() => void job)
    return { type: 5, data: { flags: 64 } }
  }
  const reply = await handleInteraction(i, { appId: i.application_id, defer })
  logEvent({ kind: 'api', name: 'discord', detail: `${i.type}:${i.data?.name ?? i.data?.custom_id ?? ''}` })
  return Response.json(reply)
}

export const GET = () => new Response('logoless bot', { status: 200 })
