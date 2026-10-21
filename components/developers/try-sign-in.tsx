'use client'

import { CheckCircle2, CircleAlert, Loader2, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SCOPES } from '@/lib/oauth-scopes'
import { cn } from '@/lib/utils'
import { CodeBlock } from './code-block'
import { LoginWithLogoless } from './login-button'

type Step = { title: string; ok: boolean | null; detail?: string; json?: unknown }
const STORE = 'logoless-try'
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const random = (n = 32) => b64(crypto.getRandomValues(new Uint8Array(n)))
const decodeJwt = (t: string) => {
  try {
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))))
  } catch {
    return null
  }
}

/**
 * The real sign-in, run with logoless's own test app, step by step: the same requests your app would make, done in this
 * browser so you can see each answer. Nothing is kept: the tokens are thrown away when you leave the page.
 */
export function TrySignIn({ clientId, redirectUri }: { clientId: string; redirectUri: string }) {
  const [scopes, setScopes] = useState<string[]>(['openid', 'profile'])
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [running, setRunning] = useState(false)
  const started = useRef(false)

  // back from the sign-in page with ?code= or ?error=
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (started.current || (!q.get('code') && !q.get('error'))) return
    started.current = true
    window.history.replaceState(null, '', window.location.pathname)
    let saved: { verifier?: string; state?: string; nonce?: string } = {}
    try {
      saved = JSON.parse(sessionStorage.getItem(STORE) ?? '{}')
      sessionStorage.removeItem(STORE)
    } catch {
      /* private mode */
    }
    void finish(q, saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const push = (s: Step) => setSteps((prev) => [...(prev ?? []), s])

  async function finish(q: URLSearchParams, saved: { verifier?: string; state?: string; nonce?: string }) {
    setRunning(true)
    setSteps([])
    if (q.get('error')) {
      push({ title: 'The sign-in page sent back an error', ok: false, detail: `${q.get('error')}: ${q.get('error_description') ?? ''}. Your app gets the same error at its return address, and should show a friendly message.` })
      setRunning(false)
      return
    }
    const stateOk = Boolean(saved.state) && q.get('state') === saved.state
    push({ title: 'Came back with a one-time code', ok: stateOk, detail: stateOk ? 'The state matched the one we sent, so this answer belongs to this sign-in. Your app must check this too.' : 'The state did not match. In your app, stop here: the answer did not come from your button.', json: { code: `${(q.get('code') ?? '').slice(0, 10)}…`, state: q.get('state'), iss: q.get('iss') } })
    if (!stateOk) return setRunning(false)

    const t = await fetch('/api/oauth/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', code: q.get('code') ?? '', redirect_uri: redirectUri, client_id: clientId, code_verifier: saved.verifier ?? '' }) })
    const tokens = (await t.json().catch(() => ({}))) as Record<string, string>
    const shown = { ...tokens, access_token: tokens.access_token ? `${tokens.access_token.slice(0, 12)}…` : undefined, id_token: tokens.id_token ? `${tokens.id_token.slice(0, 16)}…` : undefined, refresh_token: tokens.refresh_token ? `${tokens.refresh_token.slice(0, 12)}…` : undefined }
    if (!t.ok) {
      push({ title: 'Swapping the code for tokens failed', ok: false, detail: tokens.error_description, json: tokens })
      return setRunning(false)
    }
    push({ title: 'Swapped the code for tokens', ok: true, detail: 'POST /api/oauth/token with the code, the return address and the PKCE verifier. A server app sends its secret instead of (or as well as) the verifier.', json: shown })

    if (tokens.id_token) {
      const claims = decodeJwt(tokens.id_token)
      const nonceOk = claims?.nonce === saved.nonce
      push({ title: 'Read the id_token', ok: nonceOk, detail: nonceOk ? 'Who signed in, signed by logoless. The nonce matches. In your app, also check the signature with the keys address, and that aud is your client id.' : 'The nonce did not match. Your app should reject this token.', json: claims })
    }

    const u = await fetch('/api/oauth/userinfo', { headers: { authorization: `Bearer ${tokens.access_token}` } })
    const me = await u.json().catch(() => ({}))
    push({ title: u.ok ? 'Asked who you are' : 'Asking who you are failed', ok: u.ok, detail: u.ok ? 'GET /api/oauth/userinfo with the access token. Use sub as the key in your own user table: it never changes for this person in your app.' : (me as { error_description?: string }).error_description, json: me })
    setRunning(false)
  }

  const start = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    const verifier = random()
    const state = random(16)
    const nonce = random(16)
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ verifier, state, nonce }))
    } catch {
      /* without storage the state check will fail, and say so */
    }
    const challenge = b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
    const p = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: scopes.join(' '), state, nonce, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'consent' })
    window.location.href = `/oauth/authorize?${p}`
  }

  const done = steps !== null && !running
  const allOk = done && steps.length > 0 && steps.every((s) => s.ok)

  return (
    <div className="grid gap-6">
      {steps === null && (
        <div className="grid gap-5">
          <fieldset>
            <legend className="text-sm">What should the test ask for?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {SCOPES.filter((s) => s.id !== 'offline_access').map((s) => {
                const on = scopes.includes(s.id)
                const fixed = s.id === 'openid'
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    disabled={fixed}
                    title={s.gives}
                    onClick={() => setScopes(on ? scopes.filter((x) => x !== s.id) : [...scopes, s.id])}
                    className={cn('h-9 rounded-pill border px-3.5 font-mono text-xs transition-colors', on ? 'border-paper bg-paper/10' : 'border-line-strong text-mute hover:border-paper/60', fixed && 'cursor-default opacity-80')}
                  >
                    {on ? '✓ ' : '+ '}
                    {s.id}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <div>
            <LoginWithLogoless href="#" onClick={(e) => void start(e)} />
          </div>
          <p className="text-xs text-mute">You will see the same consent screen your users see. Nothing is kept: the tokens are thrown away when you leave this page, and you can disconnect the test app in Settings.</p>
        </div>
      )}

      {steps !== null && (
        <ol className="grid gap-4">
          {steps.map((s, i) => (
            <li key={i} className="rounded-2xl border border-line p-5">
              <p className="flex items-center gap-2.5">
                {s.ok ? <CheckCircle2 aria-label="Worked" className="size-5 shrink-0 text-emerald-300" /> : <CircleAlert aria-label="Failed" className="size-5 shrink-0 text-signal" />}
                <span className="font-medium">
                  {i + 1}. {s.title}
                </span>
              </p>
              {s.detail && <p className="mt-2 text-sm leading-relaxed text-mute">{s.detail}</p>}
              {s.json !== undefined && <CodeBlock code={JSON.stringify(s.json, null, 2)} label="What came back" className="mb-0" />}
            </li>
          ))}
          {running && (
            <li className="flex items-center gap-2 text-sm text-mute">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Working…
            </li>
          )}
        </ol>
      )}

      {done && (
        <div className="flex flex-wrap items-center gap-3">
          <p className={cn('text-sm', allOk ? 'text-emerald-300' : 'text-signal')}>{allOk ? 'Everything worked. Your app does exactly these steps.' : 'Something went wrong. The troubleshooting list on the Developers page covers each error.'}</p>
          <button type="button" onClick={() => setSteps(null)} className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm hover:bg-paper/10">
            <RotateCcw aria-hidden="true" className="size-4" /> Run it again
          </button>
        </div>
      )}
    </div>
  )
}
