// Browser-side helpers for the payment routes. Every call returns the server's message on failure.

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

export async function startConnect(returnTo: string) {
  const { url } = await api<{ url: string }>('/api/stripe/connect/onboard', { method: 'POST', data: { returnTo } })
  go(url)
}
export async function openBillingPortal() {
  const { url } = await api<{ url: string }>('/api/stripe/portal', { method: 'POST', data: {} })
  go(url)
}
export const withdraw = (amountUsd?: number) => api<{ ok: true; amount: number }>('/api/payouts/withdraw', { method: 'POST', data: amountUsd ? { amount: amountUsd } : {} })
