// Google and Discord sign-in are real (Auth.js, see /auth.ts). Email sign-in, sign-up and password reset are still UI-only stubs.
// Every function resolves with the path the user should land on next.
import { signIn } from 'next-auth/react'
import { ensureHuman } from './human-client'

export type Role = 'clipper' | 'brand'
export type Provider = 'discord' | 'google'

const LABEL: Record<Provider, string> = { google: 'Google', discord: 'Discord' }

/**
 * Starts the real OAuth redirect. The page leaves the site, so nothing after this runs on success.
 * `callbackUrl` is where Auth.js sends the person back to afterwards.
 */
export async function signInWithProvider(provider: Provider, role?: Role, callbackUrl?: string): Promise<string> {
  const providers = (await fetch('/api/auth/providers')
    .then((r) => r.json())
    .catch(() => ({}))) as Record<string, unknown>
  if (!providers[provider]) throw new Error(`${LABEL[provider]} sign-in is not set up yet.`)
  await ensureHuman() // Cloudflare Turnstile; skipped until its keys are added
  await signIn(provider, { callbackUrl: callbackUrl ?? (role === 'brand' ? '/brand' : '/dashboard') })
  return ''
}

/** Asks for a six-digit code by email. The answer is the same whether or not the address has an account. */
export async function sendEmailCode(email: string): Promise<void> {
  await ensureHuman()
  const res = await fetch('/api/auth/email/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'We could not send the code. Please try again.')
}

/** Signs in with the code. Creates the account the first time. Throws if the code is wrong or has expired. */
export async function signInWithCode(email: string, code: string): Promise<void> {
  const r = await signIn('email-code', { email, code, redirect: false })
  if (!r || r.error || r.ok === false) throw new Error('That code is not right, or it has expired. Check the 6 digits or ask for a new one.')
}
