'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Field, Input } from '@/components/ui/fields'
import { SITE } from '@/lib/site'
import { ActionButton, Card } from './ui'

/** Admin: pay a clipper from a brand's balance. Stand-in until views are verified automatically. */
export function EarningForm() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  return (
    <Card title="Credit earnings">
      <form
        className="grid max-w-xl gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          setBusy(true)
          setMsg(null)
          const res = await fetch('/api/admin/earnings', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              brandEmail: String(f.get('brand')).trim(),
              clipperEmail: String(f.get('clipper')).trim(),
              amount: Number(f.get('amount')),
              campaign: String(f.get('campaign') || '') || undefined,
              note: String(f.get('note') || '') || undefined,
            }),
          })
          const j = (await res.json().catch(() => ({}))) as { error?: string; gross?: number; fee?: number; net?: number }
          setBusy(false)
          if (!res.ok) return setMsg({ ok: false, text: j.error ?? 'Failed.' })
          setMsg({ ok: true, text: `Credited. Brand paid $${((j.gross ?? 0) / 100).toFixed(2)}, fee $${((j.fee ?? 0) / 100).toFixed(2)}, clipper gets $${((j.net ?? 0) / 100).toFixed(2)} after a ${SITE.holdDays}-day hold.` })
        }}
      >
        <Field label="Brand email (pays)">
          <Input required type="email" name="brand" />
        </Field>
        <Field label="Clipper email (earns)">
          <Input required type="email" name="clipper" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount in USD (before the fee)" hint={`A ${SITE.platformFeePct}% platform fee comes off the clipper's share.`}>
            <Input required name="amount" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" />
          </Field>
          <Field label="Campaign">
            <Input name="campaign" />
          </Field>
        </div>
        <Field label="Note (internal)">
          <Input name="note" />
        </Field>
        <div className="flex items-center gap-3">
          <ActionButton type="submit" disabled={busy}>
            {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            Credit earnings
          </ActionButton>
          {msg && (
            <span role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-sm' : 'text-sm text-signal'}>
              {msg.text}
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}
