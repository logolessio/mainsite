'use client'

import { Check, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { BadgeStar } from '@/components/badges/badge-star'
import { NAV_USER_REFRESH } from '@/components/shell/nav-user'
import { BADGES, MAX_EQUIPPED, type BadgeDef } from '@/lib/badges-defs'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

type Data = { unlocked: Record<string, number>; equipped: string[] }

export function AchievementsView() {
  const [data, setData] = useState<Data | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<BadgeDef | null>(null)

  useEffect(() => {
    fetch('/api/me/achievements', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: Data & { error?: string }) => (j.error ? setError(j.error) : setData(j)))
      .catch(() => setError('Could not load your achievements.'))
  }, [])

  const toggle = async (b: BadgeDef) => {
    if (!data || !(b.id in data.unlocked) || saving) return
    const has = data.equipped.includes(b.id)
    if (!has && data.equipped.length >= MAX_EQUIPPED) {
      setError(`You can equip up to ${MAX_EQUIPPED} badges. Unequip one first.`)
      return
    }
    setError('')
    const next = has ? data.equipped.filter((x) => x !== b.id) : [...data.equipped, b.id]
    setSaving(true)
    setData({ ...data, equipped: next })
    try {
      const res = await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ badges: next }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})) as { error?: string }).error ?? 'Could not save.')
      window.dispatchEvent(new Event(NAV_USER_REFRESH))
    } catch (e) {
      setData(data)
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  if (!data) return <p className="text-mute">{error || 'Loading…'}</p>
  const count = Object.keys(data.unlocked).length

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[28px] border border-line bg-surface/80 p-5">
        <div>
          <p className="font-mono text-xs text-mute">Unlocked</p>
          <p className="font-display text-5xl leading-none">
            {count}
            <span className="text-mute">/{BADGES.length}</span>
          </p>
        </div>
        <div className="flex-1">
          <p className="font-mono text-xs text-mute">On your profile ({data.equipped.length}/{MAX_EQUIPPED})</p>
          <div className="mt-2 flex min-h-[56px] flex-wrap gap-2">
            {data.equipped.length === 0 && <p className="self-center text-sm text-mute">Pick up to five unlocked badges below to show them off.</p>}
            {data.equipped.map((id) => {
              const b = BADGES.find((x) => x.id === id)
              return b ? <BadgeStar key={id} badge={b} size={56} /> : null
            })}
          </div>
        </div>
        {saving && <Loader2 className="size-4 animate-spin text-mute" />}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-signal">{error}</p>}

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {BADGES.map((b, i) => {
          const got = b.id in data.unlocked
          const on = data.equipped.includes(b.id)
          return (
            <motion.li
              key={b.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.025, 0.4), duration: 0.5, ease: EASE_OUT }}
            >
              <button
                type="button"
                onClick={() => (got ? toggle(b) : setOpen(b))}
                aria-pressed={got ? on : undefined}
                className={cn(
                  'relative flex w-full flex-col items-center gap-2 rounded-[26px] border px-3 pt-5 pb-4 text-center transition-colors',
                  on ? 'border-paper bg-paper/10' : 'border-line bg-surface/70 hover:bg-paper/5',
                )}
              >
                {on && <Check className="absolute top-3 right-3 size-4" />}
                <BadgeStar badge={b} size={92} locked={!got} />
                <span className="text-sm font-medium">{b.name}</span>
                <span className="text-xs text-mute">{b.how}</span>
                <span className="font-mono text-[10px] tracking-wider text-mute uppercase">
                  {got ? (on ? 'Equipped' : 'Tap to equip') : `${b.rarity} · ${b.points} points`}
                </span>
              </button>
            </motion.li>
          )
        })}
      </ul>
      {open && <p className="sr-only">{open.how}</p>}
    </div>
  )
}
