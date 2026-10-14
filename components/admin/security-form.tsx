'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Field, Input } from '@/components/ui/fields'
import { ActionButton } from '@/components/app/ui'

/** Make or change the admin password that guards risky actions. Changing it needs the current one. */
export function SecurityForm({ isSet }: { isSet: boolean }) {
  const [set, setSet] = useState(isSet)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setMsg(null)
    if (next !== again) return setMsg({ ok: false, text: 'The two new passwords do not match.' })
    setBusy(true)
    const res = await fetch('/api/admin/security', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ next, ...(set ? { current } : {}) }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (!res?.ok) return setMsg({ ok: false, text: j.error ?? 'Could not save that.' })
    setSet(true)
    setCurrent('')
    setNext('')
    setAgain('')
    setMsg({ ok: true, text: set ? 'Password changed.' : 'Password set. Risky actions will now ask for it.' })
  }

  return (
    <form onSubmit={submit} className="grid max-w-md gap-4">
      {set && (
        <Field label="Current admin password">
          <Input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
      )}
      <Field label={set ? 'New admin password' : 'Choose an admin password'} hint="At least 10 characters. Not your sign-in password, not used anywhere else.">
        <Input type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label="Type it again">
        <Input type="password" autoComplete="new-password" required minLength={10} value={again} onChange={(e) => setAgain(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton type="submit" disabled={busy || !next || !again}>
          {busy && <Loader2 className="size-4 animate-spin" />} {set ? 'Change password' : 'Set password'}
        </ActionButton>
        {msg && (
          <span role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-sm text-mute' : 'text-sm text-signal'}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  )
}
