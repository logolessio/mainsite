'use client'

import { AnimatePresence, motion, useMotionTemplate, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { BioConfig } from '@/lib/bio'
import { cursorCss, uploadCursorCss } from '@/lib/bio-cursors'
import { useBio } from './context'

/** The CSS variables that give a page its cursor (the page and the links on it), or nothing when it uses the ordinary one. */
export function cursorVars(cfg: BioConfig): Record<string, string> {
  const c = cfg.cursor
  if (c.kind === 'upload' && c.image) {
    const u = uploadCursorCss(c.image, c.hot, c.size)
    return { '--bio-cursor': u.arrow, '--bio-cursor-link': u.link }
  }
  if (c.kind === 'preset') {
    const u = cursorCss(c.preset, c.ink, c.size)
    return { '--bio-cursor': u.arrow, '--bio-cursor-link': u.link }
  }
  return {}
}

/** The light that follows the pointer, with the rest of the page dimmed. */
export function Spotlight() {
  const { px, py, cfg } = useBio()
  const x = useTransform(px, (v) => 50 + v * 50)
  const y = useTransform(py, (v) => 50 + v * 50)
  const shade = cfg.theme.tone > 55 ? 'rgb(0 0 0 / 0.5)' : 'rgb(0 0 0 / 0.72)'
  const bg = useMotionTemplate`radial-gradient(circle 300px at ${x}% ${y}%, transparent 0%, transparent 35%, ${shade} 100%)`
  return <motion.div aria-hidden="true" className="bio-layer" style={{ zIndex: 18, background: bg }} />
}

export { CursorFxLayer } from './cursor-layer'

/** The screen in front of a page until someone enters it. */
export function EnterGate({ onEnter }: { onEnter: () => void }) {
  const { cfg, reduced } = useBio()
  const kind = cfg.fx.enter
  const text = cfg.fx.enterText || 'click to enter'
  const [typed, setTyped] = useState(kind === 'type' ? '' : text)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (kind !== 'type') return setTyped(text)
    if (reduced) return setTyped(text)
    let i = 0
    setTyped('')
    const id = window.setInterval(() => {
      i++
      setTyped(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 70)
    return () => window.clearInterval(id)
  }, [kind, text, reduced])
  const go = () => {
    if (open) return
    setOpen(true)
    window.setTimeout(onEnter, kind === 'curtain' ? 900 : 650)
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && go()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }) // eslint-disable-line react-hooks/exhaustive-deps
  const light = cfg.theme.tone > 55
  const wash = light ? 'rgb(245 245 245 / 0.62)' : 'rgb(0 0 0 / 0.6)'
  return (
    <motion.button
      type="button"
      onClick={go}
      aria-label={text}
      className="absolute inset-0 z-[60] grid cursor-pointer place-items-center border-0 p-0 text-[var(--bio-fg)]"
      style={{ background: kind === 'curtain' ? 'transparent' : wash, backdropFilter: kind === 'curtain' ? undefined : 'blur(26px)', WebkitBackdropFilter: kind === 'curtain' ? undefined : 'blur(26px)' }}
      animate={open && kind !== 'curtain' ? { opacity: 0, backdropFilter: 'blur(0px)' } : { opacity: 1 }}
      transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {kind === 'curtain' && (
        <>
          <motion.span aria-hidden="true" className="absolute inset-y-0 left-0 w-1/2 bg-[var(--bio-bg)]" animate={{ x: open ? '-101%' : 0 }} transition={{ duration: 0.9, ease: [0.7, 0, 0.2, 1] }} />
          <motion.span aria-hidden="true" className="absolute inset-y-0 right-0 w-1/2 bg-[var(--bio-bg)]" animate={{ x: open ? '101%' : 0 }} transition={{ duration: 0.9, ease: [0.7, 0, 0.2, 1] }} />
        </>
      )}
      <motion.span className="relative text-[0.95rem] tracking-[0.32em] uppercase" animate={open ? { opacity: 0, y: -8 } : reduced ? undefined : { opacity: [0.45, 1, 0.45] }} transition={open ? { duration: 0.3 } : { duration: 2.4, repeat: Infinity }}>
        {typed}
        {kind === 'type' && <span aria-hidden="true" style={{ animation: 'bio-blink 1s steps(1) infinite' }}>|</span>}
      </motion.span>
    </motion.button>
  )
}

export { AnimatePresence }
