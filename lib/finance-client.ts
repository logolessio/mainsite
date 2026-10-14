// Browser-side helpers for the money routes. Every call throws the server's own message on failure.

export type Finance = {
  balances: { brand: number; available: number; pending: number; earned: number; withdrawn: number }
  paypalEmail: string
  paypalEmails: string[]
  topups: { id: string; amount_cents: number; status: string; created_at: number }[]
  payouts: { id: string; amount_cents: number; status: string; created_at: number }[]
  ready: boolean
  testMode: boolean
}

async function api<T>(path: string, init?: { method?: string; data?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? 'GET',
    headers: init?.data ? { 'content-type': 'application/json' } : undefined,
    body: init?.data ? JSON.stringify(init.data) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const j = (await res.json().catch(() => null)) as { error?: string } | null
  if (!res.ok) throw new Error(j?.error ?? 'Something went wrong. Please try again.')
  return j as T
}

export const cents = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const getFinance = () => api<Finance>('/api/me/finance')
export const withdraw = (email: string, amountUsd?: number) => api<{ ok: true; amount: number; review?: boolean }>('/api/payouts/withdraw', { method: 'POST', data: amountUsd ? { email, amount: amountUsd } : { email } })
export const startDeposit = (amountUsd: number) => api<{ url: string }>('/api/paypal/deposit', { method: 'POST', data: { amount: amountUsd } })
export const captureDeposit = (orderId: string) => api<{ ok: true; amount: number }>('/api/paypal/capture', { method: 'POST', data: { orderId } })
