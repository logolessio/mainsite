// Browser-side helpers for the payment routes. Every call returns the server's message on failure.

import type { ConnectStatus } from './connect-fields'

export type Finance = {
  balances: { brand: number; available: number; pending: number; earned: number; withdrawn: number }
  connect: { status: 'not_connected' | 'incomplete' | 'ready' }
  hasCustomer: boolean
  topups: { id: string; amount_cents: number; status: string; receipt_url: string | null; created_at: number }[]
  payouts: { id: string; amount_cents: number; status: string; created_at: number }[]
  testMode: boolean
}

async function api<T>(path: string, init?: { method?: string; data?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? 'GET',
    headers: init?.data ? { 'content-type': 'application/json' } : undefined,
    body: init?.data ? JSON.stringify(init.data) : undefined,
    credentials: 'same-origin',
  })
  const j = (await res.json().catch(() => null)) as { error?: string } | null
  if (!res.ok) throw new Error(j?.error ?? 'Something went wrong. Please try again.')
  return j as T
}

export const cents = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const getFinance = () => api<Finance>('/api/me/finance')
export const getConnectStatus = () => api<{ status: string }>('/api/stripe/connect/status')

const go = (url: string) => {
  window.location.href = url
}

export async function openBillingPortal() {
  const { url } = await api<{ url: string }>('/api/stripe/portal', { method: 'POST', data: {} })
  go(url)
}
export const withdraw = (amountUsd?: number) => api<{ ok: true; amount: number }>('/api/payouts/withdraw', { method: 'POST', data: amountUsd ? { amount: amountUsd } : {} })

// ---- payout setup, entirely on logoless ----
export const getConnect = () => api<ConnectStatus>('/api/stripe/connect/status')
export const createPayoutAccount = (country: string, accepted: boolean) => api<ConnectStatus>('/api/stripe/connect/account', { method: 'POST', data: { country, accepted } })
export const savePayoutDetails = (data: Record<string, unknown>) => api<ConnectStatus>('/api/stripe/connect/details', { method: 'POST', data })
export const savePayoutBank = (token: string) => api<ConnectStatus>('/api/stripe/connect/bank', { method: 'POST', data: { token } })
export type PayoutOverview = {
  available: { amount: number; currency: string }[]
  pending: { amount: number; currency: string }[]
  payouts: { id: string; amount: number; currency: string; status: string; arrival: number; created: number; failure: string | null }[]
}
export const getPayoutOverview = () => api<PayoutOverview>('/api/stripe/connect/overview')

/** Sends an ID photo to Stripe through our server, which does not keep it. Returns Stripe's file id. */
export async function uploadIdPhoto(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/stripe/connect/document', { method: 'POST', body: form, credentials: 'same-origin' })
  const j = (await res.json().catch(() => null)) as { id?: string; error?: string } | null
  if (!res.ok || !j?.id) throw new Error(j?.error ?? 'The photo could not be uploaded.')
  return j.id
}

/**
 * Swaps real bank numbers for a one-time Stripe token, straight from the browser to Stripe. logoless's server only
 * ever sees the token, never the account number.
 */
export async function tokenizeBank(publishableKey: string, f: { country: string; currency: string; name: string; routing?: string; account: string }) {
  const body = new URLSearchParams({
    'bank_account[country]': f.country,
    'bank_account[currency]': f.currency,
    'bank_account[account_holder_name]': f.name,
    'bank_account[account_holder_type]': 'individual',
    'bank_account[account_number]': f.account,
  })
  if (f.routing) body.set('bank_account[routing_number]', f.routing)
  const res = await fetch('https://api.stripe.com/v1/tokens', { method: 'POST', headers: { authorization: `Bearer ${publishableKey}`, 'content-type': 'application/x-www-form-urlencoded' }, body })
  const j = (await res.json().catch(() => null)) as { id?: string; error?: { message?: string } } | null
  if (!res.ok || !j?.id) throw new Error(j?.error?.message?.replace(/Stripe/g, 'the bank') ?? 'Those bank details were not accepted.')
  return j.id
}
