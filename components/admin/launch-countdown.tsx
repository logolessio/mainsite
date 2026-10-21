'use client'

import { askConfirm } from './confirm-dialog'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ActionButton, Card, Toggle } from '@/components/app/ui'
import { Field, Input, Textarea } from '@/components/ui/fields'
import { toast } from '@/lib/toast'
import { askAdminSecret } from './secret-dialog'

type View = { on: boolean; closed: boolean; end: number | null; headline: string; text: string; auto: boolean }
type Counts = { total: number; unsubscribed: number; reserved: number }
type Row = { key: string; e: string; h: string | null; t: number; u?: number }

const api = async <T,>(path: string, body?: unknown): Promise<T> => {
  const res = await fetch(path, { method: body ? 'POST' : 'GET', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const j = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.')
  return j
}

/** A date and time as the local clock writes it, for the date field. */
const local = (sec: number | null) => {
  if (!sec) return ''
  const d = new Date(sec * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** The owner's side of the launch page: switch it on, set when the countdown ends, see who signed up, and email them an update. */
export function LaunchCountdown() {
  const [view, setView] = useState<View | null>(null)
  const [counts, setCounts] = useState<Counts | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [end, setEnd] = useState('')
  const [headline, setHeadline] = useState('')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState<{ sent: number; total: number } | null>(null)
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api<{ view: View; counts: Counts }>('/api/admin/countdown'), api<{ rows: Row[]; counts: Counts }>('/api/admin/countdown/signups')])
    setView(a.view)
    setCounts(b.counts)
    setRows(b.rows)
    setEnd(local(a.view.end))
    setHeadline(a.view.headline)
    setText(a.view.text)
  }, [])
  useEffect(() => {
    load().catch(() => toast.error('Could not load the launch page settings.'))
  }, [load])

  const save = async (patch: Record<string, unknown>, said = 'Saved') => {
    setSaving(true)
    try {
      const r = await api<{ view: View }>('/api/admin/countdown', patch)
      setView(r.view)
      toast.ok(said)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save that.')
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    try {
      await api('/api/admin/countdown/send', { subject, message, test: true })
      toast.ok('A test is on its way to your inbox')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send the test.')
    }
  }

  const sendAll = async () => {
    if (!counts) return
    const live = counts.total - counts.unsubscribed
    if (!(await askConfirm({ title: `Email ${live} ${live === 1 ? 'person' : 'people'}?`, summary: [`Subject: "${subject}"`, `Goes to everyone on the launch list who has not unsubscribed (${live}).`, 'An email cannot be taken back once it is sent.'], word: 'SEND', action: 'Send the email', danger: true }))) return
    const secret = await askAdminSecret(`This emails everyone on the launch list (${live}).`)
    if (!secret) return
    let after: string | undefined
    let sent = 0
    setSending({ sent: 0, total: live })
    try {
      for (let i = 0; i < 2000; i++) {
        const r = await api<{ sent: number; next: string | null }>('/api/admin/countdown/send', { subject, message, after, secret })
        sent += r.sent
        setSending({ sent, total: live })
        if (!r.next) break
        after = r.next
      }
      toast.ok(`Sent to ${sent}`)
    } catch (e) {
      toast.error(`${e instanceof Error ? e.message : 'Stopped.'} (${sent} sent so far)`)
    } finally {
      setSending(null)
    }
  }

  if (!view) return <div className="flex items-center gap-3 text-mute"><Loader2 className="size-4 animate-spin" /> Loading…</div>

  const shut = view.closed
  return (
    <div className="grid max-w-3xl gap-6">
      <Card title="The launch page" sub="While it is on, everyone except the owners sees only the countdown and the sign-up, on logoless.io. Owners sign in by typing their email into the box on that page.">
        <ul className="divide-y divide-line">
          <li className="flex items-center justify-between gap-6 py-4 first:pt-0">
            <div>
              <p className="text-sm">Show the launch page</p>
              <p className="text-xs text-mute">{shut ? 'On now: the public site is hidden behind it.' : view.on ? 'Switched on, but the countdown has ended, so the site has opened by itself.' : 'Off: the site is open to everyone.'}</p>
            </div>
            <Toggle label="Show the launch page" checked={view.on} onChange={(v) => void save({ on: v }, v ? 'The launch page is on' : 'The launch page is off')} />
          </li>
          <li className="flex items-center justify-between gap-6 py-4">
            <div>
              <p className="text-sm">Open the site when the countdown ends</p>
              <p className="text-xs text-mute">Off, the page stays up at zero until you switch it off here.</p>
            </div>
            <Toggle label="Open the site when the countdown ends" checked={view.auto} onChange={(v) => void save({ auto: v })} />
          </li>
        </ul>
        <div className="mt-2 grid gap-4 border-t border-line pt-6">
          <Field label={`The countdown ends${tz ? ` (${tz})` : ''}`} hint="Leave it empty to show no countdown, only the sign-up.">
            <div className="flex flex-wrap items-center gap-3">
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="max-w-xs" />
              <ActionButton disabled={saving} onClick={() => void save({ end: end ? Math.floor(new Date(end).getTime() / 1000) : null })}>
                Set it
              </ActionButton>
            </div>
          </Field>
          <Field label="The big words">
            <Input value={headline} maxLength={90} onChange={(e) => setHeadline(e.target.value)} />
          </Field>
          <Field label="The line under the countdown">
            <Textarea value={text} maxLength={240} onChange={(e) => setText(e.target.value)} className="min-h-20" />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton disabled={saving || !headline.trim()} onClick={() => void save({ headline, text })}>
              Save the words
            </ActionButton>
            <a href="/launch/preview" target="_blank" rel="noreferrer" className="text-sm text-mute underline underline-offset-4 hover:text-paper">
              Preview it
            </a>
          </div>
        </div>
      </Card>

      <Card title="Who signed up" sub={counts ? `${counts.total} on the list · ${counts.reserved} reserved a username · ${counts.unsubscribed} unsubscribed` : undefined} action={<a href="/api/admin/countdown/signups?format=csv" className="text-sm underline underline-offset-4 hover:text-paper">Download as a spreadsheet</a>}>
        {rows.length === 0 ? (
          <p className="text-sm text-mute">Nobody yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-mute">
                <tr>
                  <th className="pb-2 font-normal">Email</th>
                  <th className="pb-2 font-normal">Username</th>
                  <th className="pb-2 text-right font-normal">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.key} className={r.u ? 'opacity-50' : undefined}>
                    <td className="truncate py-2.5 pr-4">{r.e}{r.u ? <span className="ml-2 text-xs text-mute">unsubscribed</span> : null}</td>
                    <td className="py-2.5 pr-4 text-mute">{r.h ? `@${r.h}` : ''}</td>
                    <td className="py-2.5 text-right text-xs text-mute tabular-nums">{new Date(r.t * 1000).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Email an update" sub="Goes to everyone on the list who has not unsubscribed. Each email has an unsubscribe link. Blank lines start a new paragraph.">
        <div className="grid gap-4">
          <Field label="Subject">
            <Input value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} placeholder="We open on Friday" />
          </Field>
          <Field label="Message">
            <Textarea value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} className="min-h-40" placeholder="Write the update here." />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton variant="ghost" disabled={subject.trim().length < 3 || message.trim().length < 3 || Boolean(sending)} onClick={() => void test()}>
              Send me a test
            </ActionButton>
            <ActionButton disabled={subject.trim().length < 3 || message.trim().length < 3 || Boolean(sending) || !counts || counts.total - counts.unsubscribed === 0} onClick={() => void sendAll()}>
              {sending ? `Sending… ${sending.sent} of ${sending.total}` : `Send to everyone${counts ? ` (${counts.total - counts.unsubscribed})` : ''}`}
            </ActionButton>
          </div>
        </div>
      </Card>
    </div>
  )
}
