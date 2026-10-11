import type { Metadata } from 'next'
import { EmailTools, StatusButton } from '@/components/admin/email-tools'
import { Badge } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { db, setting } from '@/lib/db'
import { emailEnabled } from '@/lib/email'
import { when } from '@/lib/format'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Email — logoless', robots: { index: false } }

type Row = { ts: number; name: string; status: number | null; detail: string | null }

export default async function Page() {
  const admin = await pageAdmin()
  const hasKey = Boolean(await setting('RESEND_API_KEY'))
  const from = (await setting('RESEND_FROM')) ?? 'logoless <login@verify.logoless.io>'
  const enabled = await emailEnabled()
  const d = await db()
  const recent = (await d.prepare("SELECT ts, name, status, detail FROM event_log WHERE name IN ('email sent','email failed') ORDER BY id DESC LIMIT 25").all<Row>()).results

  return (
    <>
      <PageHeader title="Email" sub="Check that email works and see every message we send. Members get emails when they sign up, reset a password, or sign up twice." />
      <div className="grid max-w-4xl gap-6">
        <Card title="Setup">
          <ul className="divide-y divide-line text-sm">
            <li className="flex items-center justify-between gap-4 py-2.5">
              <span>Resend key</span>
              <Badge tone={hasKey ? 'good' : process.env.NODE_ENV === 'production' ? 'bad' : 'warn'}>{hasKey ? 'Set' : process.env.NODE_ENV === 'production' ? 'Not set: email is off' : 'Not set: codes print in the server log'}</Badge>
            </li>
            <li className="flex items-center justify-between gap-4 py-2.5">
              <span>Sending from</span>
              <span className="font-mono text-xs text-mute">{from}</span>
            </li>
            <li className="flex items-center justify-between gap-4 py-2.5">
              <span>Domain and key check</span>
              <a href="/admin/keys" className="text-xs text-mute underline underline-offset-4 hover:text-paper">Run “Email (Resend)” in Keys and tests</a>
            </li>
          </ul>
        </Card>

        {enabled ? <EmailTools adminEmail={admin.email} /> : <Card><p className="text-sm text-mute">Add <span className="font-mono">RESEND_API_KEY</span> in Cloudflare (see PLATFORM_SETUP.md) and the test tools appear here.</p></Card>}

        <Card title="Recent emails">
          {recent.length === 0 ? (
            <p className="text-sm text-mute">Nothing sent yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((r, i) => {
                const [tpl, who, id] = (r.detail ?? '').split('|')
                const failed = r.name === 'email failed'
                return (
                  <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                    <span className="w-40 shrink-0 text-xs text-mute">{when(r.ts)}</span>
                    <Badge tone={failed ? 'bad' : 'good'}>{failed ? 'failed' : 'sent'}</Badge>
                    <span>{tpl}</span>
                    <span className="font-mono text-xs text-mute">{who}</span>
                    {failed ? <span className="min-w-0 truncate text-xs text-signal">{id}</span> : <StatusButton id={id ?? ''} />}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
