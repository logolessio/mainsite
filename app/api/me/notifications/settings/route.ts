import { botReady } from '@/lib/discord/api'
import { discordIdFor, dmEnabled } from '@/lib/discord/link'
import { emailEnabled } from '@/lib/email'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { centerOn, getPrefs, savePrefs } from '@/lib/notify-center'
import { isQuietNow } from '@/lib/notify-prefs'
import { nowSec } from '@/lib/db'
import { requireUser } from '@/lib/user'

/** The signed-in person's notification settings, plus what each channel needs (is Discord linked, can we send email). */
export const GET = route(async () => {
  const user = await requireUser()
  if (!(await centerOn())) throw new HttpError(404, 'Not found.')
  const [prefs, discord, dm, ready, email] = await Promise.all([getPrefs(user.id), discordIdFor(user.id), dmEnabled(user.id), botReady(), emailEnabled()])
  return json({ prefs, quietNow: isQuietNow(prefs, nowSec()), channels: { email: { ready: email, address: user.email }, discord: { linked: Boolean(discord), dm, ready } } })
})

/** Saves the settings. Anything missing keeps its current value, so the page can send just what changed. */
export const PUT = route(async (req: Request) => {
  const user = await requireUser()
  if (!(await centerOn())) throw new HttpError(404, 'Not found.')
  await protect(req, { name: 'notif-prefs', max: 60, windowSec: 60, userId: user.id })
  const prefs = await savePrefs(user.id, await body(req, 8 * 1024))
  return json({ prefs, quietNow: isQuietNow(prefs, nowSec()) })
})
