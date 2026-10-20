import { db, nowSec } from './db'
import { getApp, type OAuthApp, saveApp } from './oauth'

/**
 * The "Try it" button on the Developers page signs you in with a real app that belongs to logoless itself, so a developer
 * can watch the whole flow (consent, code, tokens, user info) before writing any code. It is made the first time it is needed,
 * and it only ever returns to /developers/try on this site's own addresses.
 */
const KEY = 'oauth:playground'
export const PLAYGROUND_PATH = '/developers/try'

export async function playgroundApp(origin: string): Promise<OAuthApp> {
  const d = await db()
  const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(KEY).first<{ value: string }>()
  let app = r ? await getApp(r.value) : null
  const back = `${origin}${PLAYGROUND_PATH}`
  if (!app) {
    const id = `lg_${[...crypto.getRandomValues(new Uint8Array(10))].map((b) => b.toString(16).padStart(2, '0')).join('')}`
    app = { id, name: 'logoless sign-in test', description: 'The test on the logoless Developers page. It shows you what an app would receive.', website: 'https://logoless.io/developers', redirectUris: [back], type: 'public', ownerId: 'logoless', secretHash: null, verified: true, suspended: false, createdAt: nowSec(), kind: 'website', useCases: ['sign-in'] }
    await saveApp(app)
    // two first visits at once: the first to write wins and the other app is simply never used
    await d.prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)').bind(KEY, id, nowSec()).run()
    const won = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(KEY).first<{ value: string }>()
    if (won && won.value !== id) app = (await getApp(won.value)) ?? app
  }
  if (!app.redirectUris.includes(back)) {
    app.redirectUris = [...app.redirectUris, back].slice(-8)
    await saveApp(app)
  }
  return app
}

/** Only our own addresses may be return addresses for the test app. */
export const playgroundOrigin = (host: string, proto: string) => {
  const h = host.toLowerCase()
  if (/^([a-z0-9-]+\.)?logoless\.io$/.test(h)) return `https://${h}`
  if (process.env.NODE_ENV !== 'production' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h)) return `${proto === 'https' ? 'https' : 'http'}://${h}`
  return 'https://logoless.io'
}
