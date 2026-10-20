import { checkRedirectUri } from '@/lib/dev-app-rules'
import { featureOn } from '@/lib/features'
import { limit } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { getApp, requireDevelopers } from '@/lib/oauth'

/**
 * The setup checker on the Developers page: give it a client id and a return address and it says, in plain words,
 * whether a sign-in would work, and why not. Client ids are public (they are in every sign-in address), so anyone may ask.
 */
export const GET = route(async (req: Request) => {
  await requireDevelopers()
  if (!(await featureOn('developer-tools'))) throw new HttpError(404, 'Not found.')
  await limit(req, { name: 'oauth-check', max: 30, windowSec: 60 })
  const q = new URL(req.url).searchParams
  const clientId = (q.get('client_id') ?? '').trim().slice(0, 60)
  const redirectUri = (q.get('redirect_uri') ?? '').trim().slice(0, 400)
  const checks: { ok: boolean; label: string; fix?: string }[] = []

  const idShape = /^lg_[0-9a-f]{20}$/.test(clientId)
  checks.push(idShape ? { ok: true, label: 'The client id looks right.' } : { ok: false, label: 'The client id is not in the right form.', fix: 'It starts with lg_ and has 20 letters and numbers after it. Copy it from your Developer dashboard.' })
  const app = idShape ? await getApp(clientId) : null
  if (idShape) checks.push(app ? { ok: true, label: `Found your app: ${app.name}.` } : { ok: false, label: 'No app has that client id.', fix: 'Check for a typo, or that the app was not deleted.' })
  if (app?.suspended) checks.push({ ok: false, label: 'This app has been switched off by logoless.', fix: 'Write to us from the contact page.' })

  if (!redirectUri) checks.push({ ok: false, label: 'No return address given.', fix: 'Paste the exact address your code sends as redirect_uri.' })
  else {
    const shape = checkRedirectUri(redirectUri, app?.type ?? 'public')
    if ('problem' in shape) checks.push({ ok: false, label: 'The return address is not valid.', fix: shape.problem })
    else if (app) {
      const exact = app.redirectUris.includes(redirectUri)
      const near = !exact && app.redirectUris.find((u) => u.replace(/\/$/, '').toLowerCase() === redirectUri.replace(/\/$/, '').toLowerCase())
      checks.push(
        exact
          ? { ok: true, label: 'The return address is registered for this app.' }
          : { ok: false, label: 'That return address is not registered for this app.', fix: near ? `Nearly: you registered ${near}. They must match exactly, including the trailing slash and capital letters.` : 'Add it to the app in your Developer dashboard. It must match exactly, character for character.' },
      )
      if (shape.dev) checks.push({ ok: true, label: 'This is a localhost address: it works on your own computer only.' })
    }
  }
  if (app) checks.push(app.type === 'public' ? { ok: true, label: 'This app cannot keep a secret, so every sign-in must use PKCE (code_challenge with S256).' } : { ok: true, label: 'This app has a secret. Send it from your server when you swap the code for tokens, never from the browser.' })

  const ready = checks.every((c) => c.ok)
  return json({
    ready,
    checks,
    app: app ? { name: app.name, type: app.type, verified: app.verified } : null,
  })
})
