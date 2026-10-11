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

async function post(path: string, data: unknown, fallback: string) {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? fallback)
}

/** Step one of signing up: checks the password and emails a six-digit code to the address. */
export async function signUpWithEmail(input: { email: string; password: string; name?: string }): Promise<void> {
  await ensureHuman()
  await post('/api/auth/signup', input, 'We could not start your sign-up. Please try again.')
}

/** Sends the sign-up code again. */
export async function resendSignupCode(email: string): Promise<void> {
  await post('/api/auth/signup/resend', { email }, 'We could not send the code. Please try again.')
}

/** Step two: the emailed code creates the account and signs the person in. */
export async function confirmSignup(email: string, code: string): Promise<void> {
  const r = await signIn('email-code', { email, code, redirect: false })
  if (!r || r.error || r.ok === false) throw new Error('That code is not right, or it has expired. Check the 6 digits or ask for a new one.')
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const r = await signIn('password', { email, password, redirect: false })
  if (!r || r.error || r.ok === false) throw new Error('That email and password do not match. If you signed up with Google or Discord, use that button instead.')
}

/** Emails a reset code. The answer is the same for every address, so it reveals nothing. */
export async function requestPasswordReset(email: string): Promise<void> {
  await ensureHuman()
  await post('/api/auth/password/forgot', { email }, 'We could not send the code. Please try again.')
}

/** Sets a new password using the emailed code. */
export async function resetPassword(email: string, code: string, password: string): Promise<void> {
  await post('/api/auth/password/reset', { email, code, password }, 'We could not reset your password. Please try again.')
}
