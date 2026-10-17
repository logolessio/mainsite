'use client'

import { Bell, Check, Mail } from 'lucide-react'
import { BrandIcon } from '@/components/brand-icon'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Card } from './ui'

type Option = { id: string; label: string; hint: string }

/** One picture for each way of being contacted: the real Discord logo, an envelope for email, a bell for the site. */
const Mark = () => <Mail className="size-5" aria-hidden="true" />
const Disc = () => <BrandIcon name="discord" className="size-5" />
const Ring = () => <Bell className="size-5" aria-hidden="true" />
const ICONS: Record<string, (() => React.JSX.Element)[]> = { both: [Mark, Disc], email: [Mark], discord: [Disc], site: [Ring] }

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
    <Card id="contact" title="How we contact you" sub="For things that matter, like a campaign ending and what you earned from it. The notification bell on the site always gets it too.">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-label="How we contact you">
        {options.map((o) => {
          const on = pref === o.id
          const icons = ICONS[o.id] ?? [Ring]
          return (
            <div key={o.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on || (!options.some((x) => x.id === pref) && o.id === options[0]?.id) ? 0 : -1}
                onClick={() => choose(o.id)}
                className={cn('group relative flex h-full w-full flex-col items-start gap-4 rounded-2xl border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-paper/60', on ? 'border-paper bg-white/[0.06]' : 'border-line-strong hover:border-paper/50 hover:bg-white/[0.03]')}
              >
                <span className="flex items-center gap-2.5">
                  {icons.map((Ic, n) => (
                    <span key={n} className={cn('grid size-11 place-items-center rounded-full transition-colors', on ? 'bg-paper text-ink' : 'bg-white/[0.07] text-paper/80 group-hover:bg-white/[0.11]')}>
                      <Ic />
                    </span>
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px]">{o.label}</span>
                  <span className="mt-0.5 block text-xs text-mute">{o.hint}</span>
                </span>
                {on && (
                  <span aria-hidden="true" className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-paper text-ink">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-signal">{error}</p>}
    </Card>
  )
}
