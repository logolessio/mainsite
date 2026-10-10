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

export async function signInWithEmail(_email: string, _password: string): Promise<string> {
  // TODO(backend): verify credentials
  return '/dashboard'
}

export async function signUpWithEmail(input: { email: string; password: string; name: string; role: Role }): Promise<string> {
  // TODO(backend): create user, send verification email
  return `/verify-email?email=${encodeURIComponent(input.email)}&role=${input.role}`
}

export async function requestPasswordReset(_email: string): Promise<void> {
  // TODO(backend): send reset email
}

export async function resetPassword(_token: string, _password: string): Promise<void> {
  // TODO(backend): set new password
}
