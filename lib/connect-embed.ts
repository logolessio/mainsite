// Browser side of Stripe's embedded Connect components (the payout forms and dashboard that live inside logoless).
import type { StripeConnectInstance } from '@stripe/connect-js'

export type EmbedKind = 'onboarding' | 'manage'

/** Colours, font and corners, so Stripe's forms look like the rest of the site. */
const appearance = {
  overlays: 'dialog' as const,
  variables: {
    colorPrimary: '#f3f2ee',
    colorBackground: '#0b0b0c',
    colorText: '#f3f2ee',
    colorSecondaryText: '#9a9a9f',
    colorBorder: '#2a2a2e',
    colorDanger: '#ff4d4d',
    buttonPrimaryColorBackground: '#f3f2ee',
    buttonPrimaryColorText: '#000000',
    buttonSecondaryColorBackground: '#16161a',
    buttonSecondaryColorText: '#f3f2ee',
    badgeNeutralColorBackground: '#16161a',
    badgeNeutralColorText: '#f3f2ee',
    borderRadius: '14px',
    spacingUnit: '11px',
    fontFamily: 'Geist, system-ui, -apple-system, Segoe UI, sans-serif',
    fontSizeBase: '15px',
  },
}

async function secret(kind: EmbedKind) {
  const res = await fetch('/api/stripe/connect/session', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind }) })
  const j = (await res.json().catch(() => null)) as { clientSecret?: string; publishableKey?: string; error?: string } | null
  if (!res.ok || !j?.clientSecret || !j.publishableKey) throw new Error(j?.error ?? 'Could not start the secure form.')
  return { clientSecret: j.clientSecret, publishableKey: j.publishableKey }
}

/** Loads Stripe's script and returns a connection that can create components. Stripe asks for a fresh secret when one expires. */
export async function startEmbed(kind: EmbedKind): Promise<StripeConnectInstance> {
  const first = await secret(kind)
  const { loadConnectAndInitialize } = await import('@stripe/connect-js')
  let used = false
  return loadConnectAndInitialize({
    publishableKey: first.publishableKey,
    appearance,
    fetchClientSecret: async () => {
      if (!used) {
        used = true
        return first.clientSecret
      }
      return (await secret(kind)).clientSecret
    },
  })
}
