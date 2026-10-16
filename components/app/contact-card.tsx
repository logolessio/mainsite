'use client'

import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Card } from './ui'

type Option = { id: string; label: string; hint: string }

/** How should we tell you about things that matter, like a campaign ending and what you earned from it? The site's bell always gets it. */
export function ContactCard() {
  const [pref, setPref] = useState<string | null>(null)
  const [options, setOptions] = useState<Option[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    fetch('/api/me/contact', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { pref: string; options: Option[] } | null) => {
        if (j) {
          setPref(j.pref)
          setOptions(j.options)
        }
      })
      .catch(() => {})
  }, [])
  if (!pref) return null
  const choose = async (id: string) => {
    const before = pref
    setPref(id)
    setError('')
    const res = await fetch('/api/me/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pref: id }) }).catch(() => null)
    if (!res?.ok) {
      setPref(before)
      setError('Could not save that. Try again.')
    }
  }
  return (
    <Card title="How we contact you" sub="For things that matter, like a campaign ending and what you earned from it. The notification bell on the site always gets it too.">
      <ul className="grid gap-2" role="radiogroup" aria-label="How we contact you">
        {options.map((o) => (
          <li key={o.id}>
            <button type="button" role="radio" aria-checked={pref === o.id} onClick={() => choose(o.id)} className={cn('flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors', pref === o.id ? 'border-paper bg-white/[0.05]' : 'border-line-strong hover:border-paper/50')}>
              <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border', pref === o.id ? 'border-paper bg-paper text-ink' : 'border-line-strong')}>{pref === o.id && <Check className="size-3" />}</span>
              <span className="min-w-0">
                <span className="block text-[15px]">{o.label}</span>
                <span className="block text-xs text-mute">{o.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-signal">{error}</p>}
    </Card>
  )
}
