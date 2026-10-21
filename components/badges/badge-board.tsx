'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { GripVertical, Loader2, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BADGES, BADGE_BY_ID, MAX_EQUIPPED, type BadgeDef } from '@/lib/badges-defs'
import { cn } from '@/lib/utils'
import { BadgeArt, RARITY_STYLE } from './badge-art'

type Drag = { id: string; from: 'slot' | 'shelf'; index: number; x: number; y: number; over: { slot: number } | { shelf: true } | null }

/** The border for each rarity, used on every badge tile: black and white like the rest of the site, brighter the rarer it is. */
export const RARITY_BORDER: Record<BadgeDef['rarity'], string> = {
  common: 'rgb(143 143 152 / 0.45)',
  rare: 'rgb(188 188 196 / 0.7)',
  epic: 'rgb(232 232 238 / 0.85)',
  legendary: 'rgb(255 255 255 / 1)',
}

/**
 * The badges on a profile, arranged by dragging: drag an earned badge onto a slot to add it, drag slots to reorder,
 * drag one back to the shelf (or press ×) to take it off. Every tile also has a + or × button, and equipped badges
 * move with the arrow keys, so nothing needs a mouse. On touch screens, press and hold a badge to pick it up.
 */
export function BadgeBoard({ unlocked, equipped, onChange, saving, compact = false }: { unlocked: string[]; equipped: string[]; onChange: (next: string[]) => void; saving?: boolean; compact?: boolean }) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  dragRef.current = drag
  const [note, setNote] = useState('')
  const shelf = BADGES.filter((b) => unlocked.includes(b.id) && !equipped.includes(b.id))
  const full = equipped.length >= MAX_EQUIPPED

  const add = (id: string, at = equipped.length) => {
    if (equipped.includes(id)) return
    if (full) {
      if (at >= MAX_EQUIPPED) return setNote(`You can show up to ${MAX_EQUIPPED}. Drop it on a badge to swap them, or take one off first.`)
      const next = [...equipped]
      next[at] = id // swap: the one that was there goes back to the shelf
      setNote('')
      return onChange(next)
    }
    const next = [...equipped]
    next.splice(Math.min(at, next.length), 0, id)
    setNote('')
    onChange(next)
  }
  const remove = (id: string) => {
    setNote('')
    onChange(equipped.filter((x) => x !== id))
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= equipped.length || from === to) return
    const next = [...equipped]
    const [x] = next.splice(from, 1)
    next.splice(to, 0, x)
    onChange(next)
  }

  // ---------- pointer dragging (mouse, pen and touch) ----------
  const press = useRef<{ id: string; from: 'slot' | 'shelf'; index: number; x: number; y: number; pointer: string; timer: number; started: boolean } | null>(null)

  const targetAt = (x: number, y: number): Drag['over'] => {
    const el = document.elementFromPoint(x, y)?.closest('[data-badge-slot],[data-badge-shelf]') as HTMLElement | null
    if (!el) return null
    if (el.dataset.badgeShelf !== undefined) return { shelf: true }
    return { slot: Number(el.dataset.badgeSlot) }
  }

  const begin = (p: NonNullable<typeof press.current>, x: number, y: number) => {
    p.started = true
    setDrag({ id: p.id, from: p.from, index: p.index, x, y, over: targetAt(x, y) })
    navigator.vibrate?.(8)
  }

  const onPointerDown = (e: React.PointerEvent, id: string, from: 'slot' | 'shelf', index: number) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-no-drag]')) return
    const p = { id, from, index, x: e.clientX, y: e.clientY, pointer: e.pointerType, timer: 0, started: false }
    // on touch, hold to pick up, so a quick swipe still scrolls the page
    if (e.pointerType === 'touch') p.timer = window.setTimeout(() => press.current === p && begin(p, p.x, p.y), 260)
    press.current = p
  }

  const finish = useCallback(
    (x: number, y: number) => {
      const d = dragRef.current
      press.current = null
      if (!d) return
      setDrag(null)
      const over = targetAt(x, y)
      if (!over) return
      if ('shelf' in over) {
        if (d.from === 'slot') remove(d.id)
        return
      }
      if (d.from === 'slot') move(d.index, Math.min(over.slot, equipped.length - 1))
      else add(d.id, over.slot)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipped, full],
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = press.current
      if (!p) return
      if (!p.started) {
        const far = Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6
        if (p.pointer === 'touch') {
          if (far) {
            window.clearTimeout(p.timer) // moved before the hold finished: it is a scroll
            press.current = null
          }
          return
        }
        if (far) begin(p, e.clientX, e.clientY)
        return
      }
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, over: targetAt(e.clientX, e.clientY) } : d))
    }
    const onUp = (e: PointerEvent) => {
      const p = press.current
      if (p) window.clearTimeout(p.timer)
      if (p?.started) finish(e.clientX, e.clientY)
      else press.current = null
    }
    const onCancel = () => {
      if (press.current) window.clearTimeout(press.current.timer)
      press.current = null
      setDrag(null)
    }
    // while a badge is held on a touch screen, the page must not scroll under the finger
    const noScroll = (e: TouchEvent) => {
      if (press.current?.started) e.preventDefault()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('touchmove', noScroll, { passive: false })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('touchmove', noScroll)
    }
  }, [finish])

  // a click that ended a drag must not also open or toggle anything
  const clickGuard = (e: React.MouseEvent) => {
    if (press.current?.started) e.preventDefault()
  }

  const ghost = drag ? BADGE_BY_ID[drag.id] : null
  const art = compact ? 64 : 84

  return (
    <div className={cn('select-none', drag && 'cursor-grabbing')}>
      <div className="mb-2.5 flex items-baseline justify-between">
        <p className="text-xs text-mute">On your profile</p>
        <p className="flex items-center gap-1.5 font-mono text-xs text-mute tabular-nums">
          {saving && <Loader2 className="size-3 animate-spin" />}
          {equipped.length}/{MAX_EQUIPPED}
        </p>
      </div>
      <ul className="grid grid-cols-5 gap-2 sm:gap-3">
        {Array.from({ length: MAX_EQUIPPED }, (_, i) => {
          const id = equipped[i]
          const b = id ? BADGE_BY_ID[id] : null
          const over = drag?.over && 'slot' in drag.over && drag.over.slot === i
          return (
            <li key={i} data-badge-slot={i} className="min-w-0">
              {b ? (
                <motion.div layout layoutId={`board-${b.id}`} transition={{ type: 'spring', stiffness: 500, damping: 38 }} className="relative">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${b.name}, badge ${i + 1} of ${equipped.length} on your profile. Arrow keys move it, Delete takes it off.`}
                    onPointerDown={(e) => onPointerDown(e, b.id, 'slot', i)}
                    onClickCapture={clickGuard}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), move(i, i - 1))
                      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), move(i, i + 1))
                      if (e.key === 'Delete' || e.key === 'Backspace') (e.preventDefault(), remove(b.id))
                    }}
                    className={cn('group grid aspect-square w-full cursor-grab touch-manipulation place-items-center rounded-2xl border-2 bg-white/[0.04] transition-all hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-paper', drag?.id === b.id && 'opacity-30', over && 'scale-[1.04] bg-white/10')}
                    style={{ borderColor: RARITY_BORDER[b.rarity] }}
                  >
                    <BadgeArt badge={b} size={art} className="pointer-events-none max-w-[74%]" />
                    <GripVertical aria-hidden="true" className="absolute bottom-1 left-1 size-3.5 text-white/30" />
                  </div>
                  <button type="button" data-no-drag onClick={() => remove(b.id)} aria-label={`Take ${b.name} off your profile`} className="absolute -top-2 -right-2 z-10 grid size-6 place-items-center rounded-pill border border-white/20 bg-[#1a1a1d] text-white shadow-md transition-colors hover:bg-signal hover:text-white">
                    <X className="size-3.5" />
                  </button>
                </motion.div>
              ) : (
                <div className={cn('grid aspect-square w-full place-items-center rounded-2xl border-2 border-dashed text-mute/60 transition-colors', over ? 'border-paper bg-white/10 text-paper' : 'border-line-strong')}>
                  <Plus className="size-5" />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div data-badge-shelf className={cn('mt-5 rounded-2xl border border-dashed p-3 transition-colors', drag?.from === 'slot' ? 'border-paper/60 bg-white/[0.04]' : 'border-line')}>
        <p className="mb-2.5 text-xs text-mute">{drag?.from === 'slot' ? 'Drop here to take it off' : shelf.length ? 'Earned badges: drag one up, or press +' : unlocked.length ? 'Every badge you have is on your profile.' : 'Earn badges by using logoless. They show up here.'}</p>
        {shelf.length > 0 && (
          <ul className={cn('grid gap-2', compact ? 'grid-cols-4 sm:grid-cols-5' : 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8')}>
            <AnimatePresence initial={false}>
              {shelf.map((b) => (
                <motion.li key={b.id} layout layoutId={`board-${b.id}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 500, damping: 38 }} className="relative min-w-0">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${b.name}. Press Enter to add it to your profile.`}
                    onPointerDown={(e) => onPointerDown(e, b.id, 'shelf', 0)}
                    onClickCapture={clickGuard}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), add(b.id))}
                    className={cn('grid aspect-square w-full cursor-grab touch-manipulation place-items-center rounded-xl border-2 bg-white/[0.03] transition-all hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-paper', drag?.id === b.id && 'opacity-30')}
                    style={{ borderColor: RARITY_BORDER[b.rarity] }}
                    title={`${b.name} · ${RARITY_STYLE[b.rarity].label}`}
                  >
                    <BadgeArt badge={b} size={compact ? 48 : 60} className="pointer-events-none max-w-[76%]" />
                  </div>
                  <button type="button" data-no-drag onClick={() => add(b.id)} disabled={full} aria-label={`Add ${b.name} to your profile`} className="absolute -top-1.5 -right-1.5 z-10 grid size-6 place-items-center rounded-pill border border-white/20 bg-paper text-ink shadow-md transition-transform hover:scale-110 disabled:bg-[#2a2a2e] disabled:text-mute">
                    <Plus className="size-3.5" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
      {note && <p role="status" className="mt-2 text-xs text-paper/70">{note}</p>}

      {ghost && drag && (
        <div aria-hidden="true" className="pointer-events-none fixed z-[300] -translate-x-1/2 -translate-y-1/2" style={{ left: drag.x, top: drag.y }}>
          <div className="grid size-20 scale-110 place-items-center rounded-2xl border-2 bg-[#141416]/95 shadow-[0_20px_40px_-10px_rgb(0_0_0/0.9)] backdrop-blur" style={{ borderColor: RARITY_BORDER[ghost.rarity] }}>
            <BadgeArt badge={ghost} size={60} />
          </div>
        </div>
      )}
    </div>
  )
}
