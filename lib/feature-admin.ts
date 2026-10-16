import { audit } from './chain'
import { FEATURE_IDS, FEATURES } from './feature-defs'
import { pushLog, readLive, setLive } from './features'
import { HttpError } from './http'

type Actor = { id: string | null; email: string }

/** What can be pushed to the live site, what is live right now, and the history of pushes. */
export async function featureList() {
  const live = await readLive()
  return { features: FEATURES.map((f) => ({ ...f, live: live[f.id] === true })), log: await pushLog() }
}

/** Pushes features to the live site (or takes them off again). Takes effect at once, and a push is announced in Discord #updates. */
export async function changeFeatures(actor: Actor, action: 'push' | 'undo', ids: string[], ip?: string) {
  const list = [...new Set(ids)]
  if (list.length === 0 || list.length > 40) throw new HttpError(400, 'Give between 1 and 40 feature ids.')
  if (list.some((id) => !FEATURE_IDS.includes(id))) throw new HttpError(400, 'Unknown feature.')
  await setLive(list, action === 'push', actor.email)
  await audit(actor, `feature.${action}`, list.join(','), null, ip)
  if (action === 'push') {
    const { postTo } = await import('./discord/outbound')
    const names = list.map((id) => FEATURES.find((f) => f.id === id)).filter(Boolean)
    await postTo('updates', { title: names.length === 1 ? `New: ${names[0]!.name}` : `${names.length} new things are live`, text: names.map((f) => `**${f!.name}**\n${f!.description.slice(0, 220)}`).join('\n\n'), href: names.length === 1 ? names[0]!.path : '/' })
  }
  return featureList()
}
