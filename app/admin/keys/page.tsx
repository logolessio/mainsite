import type { Metadata } from 'next'
import { Diagnostics } from '@/components/admin/diagnostics'
import { Badge } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { health } from '@/lib/admin-stats'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Keys and tests | logoless', robots: { index: false } }

const CHECKS = [
  { id: 'stripe', label: 'Stripe connection', hint: 'Asks Stripe for the account balance with the key we hold. Shows live or test mode.' },
  { id: 'connect', label: 'Stripe Connect', hint: 'Checks that clipper payouts are enabled on the Stripe account.' },
  { id: 'webhook', label: 'Stripe webhook', hint: 'Checks the signing secret and when the last event arrived.' },
  { id: 'database', label: 'Database', hint: 'Reads the database and counts the main tables.' },
  { id: 'ledger', label: 'Money check', hint: 'Looks for negative balances and for earnings, fees and spending that do not add up.' },
  { id: 'chains', label: 'Tamper check on the logs', hint: 'Re-computes the chain on the admin and text logs. Any edit or deletion shows up.' },
  { id: 'captcha', label: 'Human check (Turnstile)', hint: 'Asks Cloudflare whether the secret key is valid.' },
  { id: 'headers', label: 'Security headers', hint: 'Requests the home page from this browser and checks the security headers are present.' },
  { id: 'email', label: 'Email (Resend)', hint: 'Checks the key and whether your sending domain is verified.' },
  { id: 'auth', label: 'Sign-in', hint: 'Checks the sign-in secret, Google keys and admin emails.' },
]

export default async function Page() {
  await pageAdmin()
  const h = await health()
  return (
    <>
      <PageHeader title="Keys and tests" sub="See what is set up and test it. Secret values are never shown here and cannot be changed from here: to change one, edit it in Cloudflare (Settings, Variables and Secrets)." />
      <div className="grid max-w-4xl gap-6">
        <Card title="What is set up">
          <ul className="divide-y divide-line">
            {h.map((x) => (
              <li key={x.key} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span>{x.label}</span>
                <span className="flex items-center gap-3 text-xs text-mute">
                  {x.detail}
                  <Badge tone={x.state === 'ok' ? 'good' : x.state === 'warn' ? 'warn' : 'bad'}>{x.state === 'ok' ? 'OK' : x.state === 'warn' ? 'Check' : 'Fix'}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Tests">
          <p className="mb-2 text-sm text-mute">These only read. They never move money or change anything.</p>
          <Diagnostics checks={CHECKS} />
        </Card>
      </div>
    </>
  )
}
