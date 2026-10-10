'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Field, Input, Textarea } from '@/components/ui/fields'
import { ActionButton } from '@/components/app/ui'

type C = { id: string; title: string; creator: string; summary: string; rate: number; endsOn: string; cover: string; previewUrl: string }

/** Lets an admin fix the details of any campaign. Saved changes go to the audit log. */
export function CampaignEditor({ c }: { c: C }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState(c)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-xs hover:bg-paper/10">
        Edit
      </button>
    )
  const save = async () => {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/admin/campaigns/${c.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'edit',
        title: v.title,
        creator: v.creator,
        summary: v.summary,
        rate: v.rate,
        endsOn: v.endsOn || null,
        cover: v.cover,
        previewUrl: v.previewUrl || null,
      }),
    }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string } | undefined
    setBusy(false)
    if (!res?.ok) return setError(j?.error ?? 'Could not save.')
    setOpen(false)
    router.refresh()
  }
  return (
    <div className="mt-3 grid w-full gap-3 rounded-2xl border border-line bg-ink/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title"><Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
        <Field label="Artist or brand"><Input value={v.creator} onChange={(e) => setV({ ...v, creator: e.target.value })} /></Field>
        <Field label="Rate per 1,000 views (USD)"><Input type="number" step="0.1" value={v.rate} onChange={(e) => setV({ ...v, rate: Number(e.target.value) })} /></Field>
        <Field label="Ends (text, e.g. Dec 14)"><Input value={v.endsOn} onChange={(e) => setV({ ...v, endsOn: e.target.value })} /></Field>
        <Field label="Cover (site path or https)"><Input value={v.cover} onChange={(e) => setV({ ...v, cover: e.target.value })} /></Field>
        <Field label="Audio preview (site path)"><Input value={v.previewUrl} onChange={(e) => setV({ ...v, previewUrl: e.target.value })} /></Field>
      </div>
      <Field label="Brief"><Textarea value={v.summary} rows={4} onChange={(e) => setV({ ...v, summary: e.target.value })} /></Field>
      <div className="flex items-center gap-3">
        <ActionButton onClick={save} disabled={busy}>Save</ActionButton>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-mute hover:text-paper">Cancel</button>
        {error && <span role="alert" className="text-sm text-signal">{error}</span>}
      </div>
    </div>
  )
}
