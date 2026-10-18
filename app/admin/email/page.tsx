import type { Metadata } from 'next'
import { CheckCircle2, KeyRound, Send, XCircle } from 'lucide-react'
import { EmailStudio, StatusButton } from '@/components/admin/email-tools'
import { PageHeader } from '@/components/app/ui'
import { db, setting } from '@/lib/db'
import { emailEnabled } from '@/lib/email'
import { PREVIEWS } from '@/lib/email-templates'
import { when } from '@/lib/format'
import { pageAdmin } from '@/lib/user'
import { cn } from '@/lib/utils'
import { SectionTabs } from '@/components/app/section-tabs'

export const metadata: Metadata = { title: 'Email | logoless', robots: { index: false } }

type Row = { ts: number; name: string; status: number | null; detail: string | null }

const HINTS: Record<string, string> = {
  signup: 'Sent when someone signs up. The code proves the address is theirs, and nothing is created until they enter it.',
  reset: 'Sent by “Forgot your password”. Shows where the request came from so people can spot a stranger.',
  already: 'Sent instead of a code when someone signs up with an address that already has an account.',
  plain: 'A simple message, just to prove that sending works.',
}

export default async function Page() {
  const admin = await pageAdmin()
  const hasKey = Boolean(await setting('RESEND_API_KEY'))
  const from = (await setting('RESEND_FROM')) ?? 'logoless <login@verify.logoless.io>'
  const enabled = await emailEnabled()
  const d = await db()
  const recent = (await d.prepare("SELECT ts, name, status, detail FROM event_log WHERE name IN ('email sent','email failed') ORDER BY id DESC LIMIT 25").all<Row>()).results
  const sent = recent.filter((r) => r.name === 'email sent').length
  const failed = recent.length - sent
  const previews = PREVIEWS.map((p) => {
    const m = p.make()
    return { id: p.id, label: p.label, hint: HINTS[p.id] ?? '', subject: m.subject, html: m.html }
  })
  const prod = process.env.NODE_ENV === 'production'

  const status = [
    { icon: <KeyRound className="size-4" />, label: 'Resend key', value: hasKey ? 'Set' : prod ? 'Not set' : 'Not set (local: codes print in the log)', ok: hasKey },
    { icon: <Send className="size-4" />, label: 'Sending from', value: from.replace(/^.*<(.*)>$/, '$1'), ok: hasKey },
    { icon: <CheckCircle2 className="size-4" />, label: 'Recent sends', value: recent.length ? `${sent} sent, ${failed} failed` : 'None yet', ok: failed === 0 },
  ]

  return (
    <>
      <SectionTabs group="talk" />
      <PageHeader title="Email" sub="Check that email works, see exactly what members receive, and send yourself a test of each one." />
      <div className="grid max-w-5xl gap-6">
        <ul className="grid gap-3 sm:grid-cols-3">
          {status.map((s) => (
            <li key={s.label} className="flex items-center gap-3 rounded-[calc(22px*var(--round,1))] border border-line bg-surface/70 p-4">
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-pill', s.ok ? 'bg-emerald-300/15 text-emerald-300' : 'bg-amber-300/15 text-amber-300')}>{s.icon}</span>
              <span className="min-w-0">
                <span className="block font-mono text-[11px] text-mute">{s.label}</span>
                <span className="block truncate text-sm">{s.value}</span>
              </span>
            </li>
          ))}
        </ul>

        {enabled ? (
          <EmailStudio adminEmail={admin.email} from={from} previews={previews} />
        ) : (
          <div className="rounded-[calc(28px*var(--round,1))] border border-line bg-surface/70 p-6 text-sm text-mute">
            Add <span className="font-mono text-paper">RESEND_API_KEY</span> in Cloudflare (see PLATFORM_SETUP.md) and the previews and test tools appear here. Also run “Email (Resend)” in{' '}
            <a href="/admin/keys" className="underline underline-offset-4 hover:text-paper">Keys and tests</a> to check the domain.
          </div>
        )}

        <section className="rounded-[calc(28px*var(--round,1))] border border-line bg-surface/70 p-5">
          <h2 className="font-display text-2xl">Recent emails</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-mute">Nothing sent yet.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {recent.map((r, i) => {
                const [tpl, who, id] = (r.detail ?? '').split('|')
                const bad = r.name === 'email failed'
                return (
                  <li key={i} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-3', bad ? 'border-signal/40 bg-signal/[0.05]' : 'border-line')}>
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-pill', bad ? 'bg-signal/20 text-signal' : 'bg-emerald-300/15 text-emerald-300')}>{bad ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{tpl}</span>
                      <span className="block truncate font-mono text-[11px] text-mute">
                        {who} · {when(r.ts)}
                        {bad && id ? ` · ${id}` : ''}
                      </span>
                    </span>
                    {!bad && <StatusButton id={id ?? ''} />}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
