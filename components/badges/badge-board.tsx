'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BADGES, BADGE_BY_ID, MAX_EQUIPPED, type BadgeDef } from '@/lib/badges-defs'
import { cn } from '@/lib/utils'
import { BadgeArt, RARITY_STYLE } from './badge-art'

type Drag = { id: string; from: 'slot' | 'shelf'; index: number; x: number; y: number; over: { slot: number } | { shelf: true } | null }

/**
 * The badges on a profile, arranged by dragging: drag an earned badge onto a slot to add it, drag slots to reorder, drag one back
 * down to take it off. Pressing an earned badge adds it, and the small cross on a slot takes it off, so nothing needs a mouse.
 * Equipped badges move with the arrow keys. On touch screens, press and hold a badge to pick it up.
 */
export function BadgeBoard({ unlocked, equipped: equippedRaw, onChange, saving, compact = false }: { unlocked: string[]; equipped: string[]; onChange: (next: string[]) => void; saving?: boolean; compact?: boolean }) {
  // what is on the profile, cleaned: only badges that exist, each one once (a badge listed twice, or one that has since been removed, used to leave an empty gap or an
  // invisible tile in the row)
  const equipped = useMemo(() => [...new Set(equippedRaw)].filter((id) => BADGE_BY_ID[id]).slice(0, MAX_EQUIPPED), [equippedRaw])
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  dragRef.current = drag
  const [note, setNote] = useState('')
  const shelf = BADGES.filter((b) => unlocked.includes(b.id) && !equipped.includes(b.id))
  const full = equipped.length >= MAX_EQUIPPED

  const add = (id: string, at = equipped.length) => {
    if (equipped.includes(id)) return
    if (full) {
      if (at >= MAX_EQUIPPED) return setNote(`You can show up to ${MAX_EQUIPPED}. Take one off first, or drop this one onto a badge to swap them.`)
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
  const justDragged = useRef(false)

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
      justDragged.current = true // the click that follows a drop must not also add or open anything
      window.setTimeout(() => (justDragged.current = false), 0)
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

  const ghost = drag ? BADGE_BY_ID[drag.id] : null
  const art = compact ? 60 : 76

  return (
    <div className={cn('select-none', drag && 'cursor-grabbing')}>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-medium">On your profile</p>
        <p className="flex items-center gap-1.5 font-mono text-xs text-mute tabular-nums">
          {saving && <Loader2 className="size-3 animate-spin" />}
          {equipped.length} of {MAX_EQUIPPED}
        </p>
      </div>
      <ul className="grid grid-cols-5 gap-2.5 sm:gap-3">
        {Array.from({ length: MAX_EQUIPPED }, (_, i) => {
          const id = equipped[i]
          const b = id ? BADGE_BY_ID[id] : null
          const over = drag?.over && 'slot' in drag.over && drag.over.slot === i
          return (
            <li key={i} data-badge-slot={i} className="min-w-0">
              {b ? (
                <motion.div key={b.id} layout="position" initial={false} transition={{ type: 'spring', stiffness: 420, damping: 36 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${b.name}, badge ${i + 1} of ${equipped.length} on your profile. Arrow keys move it, Delete takes it off.`}
                    onPointerDown={(e) => onPointerDown(e, b.id, 'slot', i)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), move(i, i - 1))
                      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), move(i, i + 1))
                      if (e.key === 'Delete' || e.key === 'Backspace') (e.preventDefault(), remove(b.id))
                    }}
                    className={cn('group relative grid aspect-square w-full cursor-grab touch-manipulation place-items-center rounded-panel border border-line-strong bg-white/[0.035] transition-all hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-paper', drag?.id === b.id && 'opacity-30', over && 'border-paper bg-white/10')}
                  >
                    <span className="pointer-events-none block w-[70%]">
                      <BadgeArt badge={b} size={art} fluid />
                    </span>
                    <button
                      type="button"
                      data-no-drag
                      onClick={() => remove(b.id)}
                      aria-label={`Take ${b.name} off your profile`}
                      title="Take off"
                      className="absolute top-1.5 right-1.5 z-10 grid size-6 place-items-center rounded-pill text-mute opacity-0 transition-all group-hover:opacity-100 hover:bg-white/15 hover:text-paper focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                    >
                      <X aria-hidden="true" className="size-3.5" />
                    </button>
                  </div>
                  {!compact && <p className="mt-2 truncate text-center text-xs text-mute">{b.name}</p>}
                </motion.div>
              ) : (
                <div className={cn('grid aspect-square w-full place-items-center rounded-panel border border-dashed text-mute/50 transition-colors', over ? 'border-paper bg-white/10 text-paper' : 'border-line-strong')}>
                  <Plus aria-hidden="true" className="size-4" />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div data-badge-shelf className={cn('mt-7 rounded-panel border border-dashed transition-colors', drag?.from === 'slot' ? 'border-paper/50 bg-white/[0.04] p-3' : 'border-transparent')}>
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-sm font-medium">Earned</p>
          <p className="text-xs text-mute">{drag?.from === 'slot' ? 'Drop here to take it off' : shelf.length ? 'Press one to add it, or drag it up' : ''}</p>
        </div>
        {shelf.length > 0 ? (
          <ul className={cn('grid gap-2.5', compact ? 'grid-cols-[repeat(auto-fill,minmax(58px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(68px,1fr))]')}>
            <AnimatePresence initial={false}>
              {shelf.map((b) => (
                <motion.li key={b.id} layout="position" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="min-w-0">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${b.name}. Press Enter to add it to your profile.`}
                    onPointerDown={(e) => onPointerDown(e, b.id, 'shelf', 0)}
                    onClick={() => !justDragged.current && add(b.id)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), add(b.id))}
                    className={cn('grid aspect-square w-full cursor-grab touch-manipulation place-items-center rounded-panel border border-line bg-white/[0.025] transition-all hover:border-line-strong hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-paper', drag?.id === b.id && 'opacity-30')}
                    title={`${b.name}, ${RARITY_STYLE[b.rarity].label}`}
                  >
                    <span className="pointer-events-none block w-[72%]">
                      <BadgeArt badge={b} size={compact ? 52 : 60} fluid />
                    </span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="text-sm text-mute">{unlocked.length ? 'Every badge you have is on your profile.' : 'Earn badges by using logoless. They show up here.'}</p>
        )}
      </div>
      {note && (
        <p role="status" className="mt-3 text-xs text-paper/70">
          {note}
        </p>
      )}

      {ghost && drag && (
        <div aria-hidden="true" className="pointer-events-none fixed z-[300] -translate-x-1/2 -translate-y-1/2" style={{ left: drag.x, top: drag.y }}>
          <div className="grid size-20 scale-110 place-items-center rounded-panel border border-line-strong bg-[#141416]/95 shadow-[0_20px_40px_-10px_rgb(0_0_0/0.9)] backdrop-blur">
            <span className="block w-14">
              <BadgeArt badge={ghost} size={56} fluid />
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
