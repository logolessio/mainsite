'use client'

import { askConfirm } from './confirm-dialog'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BADGES } from '@/lib/badges-defs'
import { runSiteCheck } from '@/lib/site-check-client'
import { askAdminSecret } from './secret-dialog'
import { AdminButton } from './ui'

async function post(id: string, data: object) {
  const res = await fetch(`/api/admin/people/${id}/action`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as { error?: string; emailed?: boolean; discord?: boolean; balance?: number }
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.')
  return j
}

const input = 'h-11 w-full rounded-2xl border border-line-strong bg-ink/80 px-4 text-sm outline-none focus:border-paper'
const label = 'mb-1.5 block text-xs text-mute'
const btn = 'inline-flex h-10 items-center justify-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40'

function useAction(id: string) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const run = async (data: object, ok: (j: Awaited<ReturnType<typeof post>>) => string, crucial?: string) => {
    setBusy(true)
    setMsg(null)
    try {
      const j = await post(id, data)
      setMsg({ ok: true, text: ok(j) })
      if (crucial) runSiteCheck(crucial)
      router.refresh()
      return true
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong.' })
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, msg, run }
}

const Msg = ({ m }: { m: { ok: boolean; text: string } | null }) => (m ? <p role={m.ok ? 'status' : 'alert'} className={`mt-3 text-sm ${m.ok ? 'text-emerald-300' : 'text-signal'}`}>{m.text}</p> : null)

/** Tell this person something: it lands in their notifications, and optionally their inbox and Discord. */
export function MessageBox({ id }: { id: string }) {
  const { busy, msg, run } = useAction(id)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [href, setHref] = useState('')
  const [email, setEmail] = useState(false)
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (await run({ action: 'message', title, text, href: href || undefined, email }, (j) => `Sent${j.emailed ? ', emailed' : ''}${j.discord ? ' and messaged on Discord' : ''}.`)) {
          setTitle('')
          setText('')
          setHref('')
        }
      }}
    >
      <div>
        <label className={label} htmlFor={`mt-${id}`}>Title</label>
        <input id={`mt-${id}`} className={input} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. A quick note about your clip" />
      </div>
      <div>
        <label className={label} htmlFor={`mb-${id}`}>Message (optional)</label>
        <textarea id={`mb-${id}`} className={`${input} h-24 py-3`} value={text} maxLength={240} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className={label} htmlFor={`ml-${id}`}>Link (optional)</label>
          <input id={`ml-${id}`} className={input} value={href} maxLength={200} onChange={(e) => setHref(e.target.value)} placeholder="/dashboard/submissions" />
        </div>
        <label className="flex h-11 items-center gap-2 text-sm text-mute">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="size-4 accent-white" /> Also email them
        </label>
      </div>
      <div>
        <button type="submit" disabled={busy || title.trim().length < 2} className={btn}>
          {busy && <Loader2 className="size-4 animate-spin" />} Send
        </button>
        <Msg m={msg} />
      </div>
    </form>
  )
}

/** Correct a balance by hand. Always with a reason, always with the admin password, and a debit can never take it below zero. */
export function AdjustMoney({ id }: { id: string }) {
  const { busy, msg, run } = useAction(id)
  const [account, setAccount] = useState<'brand' | 'clipper'>('clipper')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const n = Number(amount)
  const valid = Number.isFinite(n) && n !== 0 && Math.abs(n) <= 10000 && note.trim().length >= 3
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        const where = account === 'brand' ? 'brand balance' : 'clipper earnings'
        const ok = await askConfirm({
          title: n < 0 ? `Take $${Math.abs(n).toFixed(2)} away?` : `Add $${n.toFixed(2)}?`,
          summary: [`${n < 0 ? 'Takes' : 'Adds'} $${Math.abs(n).toFixed(2)} ${n < 0 ? 'from' : 'to'} this person's ${where}.`, `They see the reason: "${note.trim()}".`, 'It is written to the audit log. A debit can never take them below zero.'],
          action: n < 0 ? 'Take it away' : 'Add it',
          danger: n < 0,
        })
        if (!ok) return
        const pass = await askAdminSecret(`${n < 0 ? 'Taking' : 'Adding'} $${Math.abs(n).toFixed(2)} ${n < 0 ? 'from' : 'to'} this person's ${account === 'brand' ? 'brand balance' : 'earnings'}.`)
        if (!pass) return
        if (await run({ action: 'adjust', account, amount: n, note, secret: pass }, (j) => `Done. Their ${account === 'brand' ? 'balance' : 'earnings'} are now $${((j.balance ?? 0) / 100).toFixed(2)}.`, 'a balance adjustment')) {
          setAmount('')
          setNote('')
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor={`aa-${id}`}>Which money</label>
          <select id={`aa-${id}`} className={input} value={account} onChange={(e) => setAccount(e.target.value as 'brand' | 'clipper')}>
            <option value="clipper">Clipper earnings</option>
            <option value="brand">Brand balance</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor={`am-${id}`}>Amount in dollars (minus to take away)</label>
          <input id={`am-${id}`} className={input} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.-]/g, ''))} placeholder="25 or -10.50" />
        </div>
        <div>
          <label className={label} htmlFor={`an-${id}`}>Reason (they will see it)</label>
          <input id={`an-${id}`} className={input} value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Goodwill credit" />
        </div>
      </div>
      <div>
        <button type="submit" disabled={busy || !valid} className={btn}>
          {busy && <Loader2 className="size-4 animate-spin" />} Adjust
        </button>
        <Msg m={msg} />
      </div>
    </form>
  )
}

/** Verify them by hand, and give or take away a badge. */
export function Recognise({ id, verified }: { id: string; verified: boolean }) {
  const { busy, msg, run } = useAction(id)
  const [badge, setBadge] = useState('team')
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-mute">{verified ? 'Verified.' : 'Not verified yet.'}</span>
        {!verified && (
          <button type="button" disabled={busy} className="inline-flex h-9 items-center rounded-pill border border-line-strong px-4 text-xs hover:bg-paper/10 disabled:opacity-40" onClick={() => run({ action: 'verify' }, () => 'Marked as verified.')}>
            Mark as verified
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Badge" className="h-10 rounded-pill border border-line-strong bg-ink/80 px-4 text-sm" value={badge} onChange={(e) => setBadge(e.target.value)}>
          {BADGES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.rarity})
            </option>
          ))}
        </select>
        <button type="button" disabled={busy} className={btn} onClick={() => run({ action: 'badge', badge, on: true }, () => 'Badge given.')}>
          Give
        </button>
        <button type="button" disabled={busy} className="inline-flex h-10 items-center rounded-pill border border-line-strong px-5 text-sm hover:bg-paper/10 disabled:opacity-40" onClick={async () => (await askConfirm({ title: 'Take this badge away?', summary: ['It disappears from their profile straight away.'], action: 'Take it away' })) && run({ action: 'badge', badge, on: false }, () => 'Badge taken away.')}>
          Take away
        </button>
      </div>
      <Msg m={msg} />
    </div>
  )
}

/** Suspend, ban, reinstate, add or clear extra checks. */
export function Moderation({ id, status, risk, canBan = false }: { id: string; status: string; risk: string; /** banning is for the owner only */ canBan?: boolean }) {
  const url = `/api/admin/users/${id}`
  return (
    <div className="flex flex-wrap gap-2">
      {status === 'active' ? (
        <>
          <AdminButton url={url} data={{ action: 'suspend' }} ask={{ label: 'Reason', required: true }} confirm="Suspend this account?" summary={['They cannot submit clips, withdraw or run campaigns until you reinstate them.', 'Nothing is deleted, and you can reinstate them at any time.']}>Suspend</AdminButton>
          {canBan && <AdminButton variant="danger" url={url} data={{ action: 'ban' }} ask={{ label: 'Reason', required: true }} secret="Banning someone locks them out for good." confirm="Ban this person for good?" summary={['They are signed out and can never sign in again.', 'Only the owner can ban, and it needs your admin password.']} typed="BAN">Ban</AdminButton>}
        </>
      ) : (
        <AdminButton variant="solid" url={url} data={{ action: 'reinstate' }}>Reinstate</AdminButton>
      )}
      {risk === 'low' ? (
        <AdminButton url={url} data={{ action: 'flag' }} ask={{ label: 'Why? (optional)' }}>Add extra checks</AdminButton>
      ) : (
        <AdminButton url={url} data={{ action: 'unflag' }}>Clear extra checks</AdminButton>
      )}
    </div>
  )
}
