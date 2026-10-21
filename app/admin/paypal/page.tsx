import { Check, X } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CopyButton } from '@/components/admin/copy-button'
import { Diagnostics } from '@/components/admin/diagnostics'
import { Card, PageHeader } from '@/components/app/ui'
import { setting } from '@/lib/db'
import { pageAdmin } from '@/lib/user'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'PayPal setup | logoless', robots: { index: false } }

const EVENTS = [
  'PAYMENT.CAPTURE.COMPLETED',
  'PAYMENT.CAPTURE.REFUNDED',
  'PAYMENT.CAPTURE.REVERSED',
  'PAYMENT.CAPTURE.DENIED',
  'PAYMENT.PAYOUTS-ITEM.SUCCEEDED',
  'PAYMENT.PAYOUTS-ITEM.FAILED',
  'PAYMENT.PAYOUTS-ITEM.BLOCKED',
  'PAYMENT.PAYOUTS-ITEM.DENIED',
  'PAYMENT.PAYOUTS-ITEM.CANCELED',
  'PAYMENT.PAYOUTS-ITEM.RETURNED',
  'PAYMENT.PAYOUTS-ITEM.REFUNDED',
  'PAYMENT.PAYOUTS-ITEM.UNCLAIMED',
]
const WEBHOOK = 'https://logoless.io/api/paypal/webhook'

/** A walk through putting PayPal in: what is already set, the exact commands for what is not, the webhook to create, and the tests to run. Values of secrets are never shown. */
export default async function Page() {
  await pageAdmin()
  const [id, secret, env, hook, base] = await Promise.all([setting('PAYPAL_CLIENT_ID'), setting('PAYPAL_CLIENT_SECRET'), setting('PAYPAL_ENV'), setting('PAYPAL_WEBHOOK_ID'), setting('PAYPAL_API_BASE')])
  const mode = (env ?? 'live').trim().toLowerCase() === 'sandbox' ? 'sandbox' : 'live'
  const keys = Boolean(id && secret)
  const steps: { title: string; done: boolean; note: string }[] = [
    { title: 'Client ID and Secret are set', done: keys, note: keys ? `Both secrets are on the site. Mode: ${mode}.` : 'Create the app on developer.paypal.com (steps below), then add both as secrets.' },
    { title: 'The mode is what you mean it to be', done: keys, note: mode === 'sandbox' ? 'Sandbox: nothing real moves. Good for testing. Change PAYPAL_ENV to live when you launch.' : 'Live: real money moves. Only keep this when you have tested in sandbox.' },
    { title: 'The webhook is added and its ID is set', done: Boolean(hook), note: hook ? 'PAYPAL_WEBHOOK_ID is set. Run the webhook test below to prove it.' : 'Without it, refunds and failed payouts are not noticed.' },
    { title: 'No test override is on', done: !base, note: base ? 'PAYPAL_API_BASE is set. That is for a laptop only: remove it on the real site.' : 'PAYPAL_API_BASE is not set, which is right.' },
  ]
  const cmd = (n: string) => `npx wrangler secret put ${n}`
  return (
    <>
      <PageHeader title="PayPal setup" sub="Everything money on logoless runs through PayPal. This page shows what is done, what is left, and gives you the exact things to copy." />
      <div className="grid max-w-4xl gap-6">
        <Card title="Where you are">
          <ul className="divide-y divide-line px-6 pb-2">
            {steps.map((s) => (
              <li key={s.title} className="flex items-start gap-3 py-4">
                <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-pill', s.done ? 'bg-paper text-ink' : 'border border-line-strong text-mute')}>{s.done ? <Check className="size-3" /> : <X className="size-3" />}</span>
                <span>
                  <span className="block text-[15px]">{s.title}</span>
                  <span className="block text-sm text-mute">{s.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="1. Make the PayPal app" sub="Once, on developer.paypal.com, signed in as the Business account.">
          <ol className="grid gap-3 px-6 pb-6 text-[15px] leading-relaxed text-paper/85">
            <li>
              <strong className="font-medium">Business account.</strong> It has to be a verified PayPal Business account, or PayPal limits payouts.
            </li>
            <li>
              <strong className="font-medium">Payouts.</strong> Ask PayPal to turn on the <em>Payouts</em> product (Pay &amp; Get Paid, or merchant support). They review it, so ask first: without it creators cannot be paid.
            </li>
            <li>
              <strong className="font-medium">Create the app.</strong> Apps &amp; Credentials, start on <em>Sandbox</em>, Create App, type Merchant, call it logoless, tick <em>Accept payments</em> and <em>Payouts</em>. Copy the Client ID and the Secret.
            </li>
            <li>
              <strong className="font-medium">Repeat on Live</strong> when sandbox works. Live has its own Client ID and Secret.
            </li>
          </ol>
        </Card>

        <Card title="2. Give the keys to the site" sub="Run each in the project folder. It asks for the value; paste it and press Enter. Nothing is ever printed.">
          <div className="grid gap-2 px-6 pb-6">
            {[cmd('PAYPAL_CLIENT_ID'), cmd('PAYPAL_CLIENT_SECRET'), cmd('PAYPAL_ENV'), cmd('PAYPAL_WEBHOOK_ID')].map((c) => (
              <div key={c} className="flex items-center justify-between gap-3 rounded-panel border border-line bg-black/40 px-4 py-2.5">
                <code className="min-w-0 truncate font-mono text-sm">{c}</code>
                <CopyButton text={c} />
              </div>
            ))}
            <p className="mt-2 text-sm text-mute">
              For <code className="font-mono">PAYPAL_ENV</code> type <code className="font-mono">sandbox</code> while testing, <code className="font-mono">live</code> to launch. You can also add them in Cloudflare: Workers &amp; Pages, mainsite, Settings, Variables and Secrets (type: Secret).
            </p>
          </div>
        </Card>

        <Card title="3. The webhook" sub="In the same PayPal app: Webhooks, Add Webhook.">
          <div className="grid gap-4 px-6 pb-6">
            <div className="flex items-center justify-between gap-3 rounded-panel border border-line bg-black/40 px-4 py-2.5">
              <code className="min-w-0 truncate font-mono text-sm">{WEBHOOK}</code>
              <CopyButton text={WEBHOOK} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-mute">Tick these events</p>
                <CopyButton text={EVENTS.join('\n')} label="Copy the list" />
              </div>
              <ul className="grid gap-1 font-mono text-xs text-paper/70 sm:grid-cols-2">
                {EVENTS.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-mute">Save it, copy the <em>Webhook ID</em> PayPal shows, and add it as <code className="font-mono">PAYPAL_WEBHOOK_ID</code> (step 2).</p>
          </div>
        </Card>

        <Card title="4. Test it" sub="These run on the real site, with the keys it holds.">
          <div className="px-6 pb-6">
            <Diagnostics
              checks={[
                { id: 'paypal', label: 'PayPal connection', hint: 'Asks PayPal for a token with the keys we hold. Shows live or sandbox mode.' },
                { id: 'webhook', label: 'PayPal webhook', hint: 'Checks the webhook ID is on the PayPal app, and when the last event arrived.' },
                { id: 'ledger', label: 'Money check', hint: 'Looks for balances and totals that do not add up.' },
              ]}
            />
            <ol className="mt-6 grid gap-2 text-sm leading-relaxed text-mute">
              <li>As a brand, add $10 with a sandbox buyer account (PayPal gives you one under Sandbox, Accounts). The balance should go up.</li>
              <li>As a creator with earnings, add a sandbox PayPal email and withdraw $10. It should show as sent.</li>
              <li>In PayPal, send a simulated event to the webhook, then run the webhook test again: it should show the event.</li>
              <li>
                Happy? Switch to the Live keys, set <code className="font-mono">PAYPAL_ENV</code> to <code className="font-mono">live</code>, make the webhook again on the Live app, and update <code className="font-mono">PAYPAL_WEBHOOK_ID</code>.
              </li>
            </ol>
            <p className="mt-4 text-sm text-mute">
              More detail is in <code className="font-mono">PAYPAL_SETUP.md</code>. The other checks are on <Link href="/admin/keys" className="underline underline-offset-4 hover:text-paper">Keys and tests</Link>.
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}
