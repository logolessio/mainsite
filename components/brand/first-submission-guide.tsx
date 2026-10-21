'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, Ban, Pause, Play, ShieldCheck, SlidersHorizontal, Wallet, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFeature } from '@/components/shell/features-provider'
import { useDialog } from '@/hooks/use-dialog'
import { useMotionPrefs, useMounted } from '@/hooks/use-motion-prefs'
import { SPRING_POP } from '@/lib/layout'
import { firstSubSeenHere, rememberSeen, startTour, tourRunning } from './client-tour'
import type { StepId } from './tour-steps'

type Item = { icon: React.ReactNode; title: string; body: string; show?: StepId; link?: { label: string; href: string } }

// Only what a client can really do today. Approving is done by us after the view check, so it is explained, not offered.
const ITEMS: Item[] = [
  { icon: <Play className="size-4" />, title: 'Watch it', body: 'Open the post where it went live and see exactly what the creator made.', show: 'watch' },
  { icon: <ShieldCheck className="size-4" />, title: 'Approving is on us', body: 'There is nothing to approve. We check every submission and its real views on the platform before anyone is paid.' },
  { icon: <Ban className="size-4" />, title: 'Turn it down', body: 'Off-brief? Turn it down with a reason the creator sees. It stops earning from you. This works until its views have been paid for.', show: 'turn-down' },
  { icon: <Pause className="size-4" />, title: 'Pause or start the campaign', body: 'Pause stops all new spending at once; Start brings it back. A campaign ends on its own when its budget is used up.', show: 'pause' },
  { icon: <SlidersHorizontal className="size-4" />, title: 'Top up the budget, set caps', body: 'Under Budget and limits: raise the budget, or cap what one submission or one creator can earn.', show: 'budget' },
  { icon: <Wallet className="size-4" />, title: 'Add funds', body: 'Every campaign draws from one balance. Top it up with PayPal; we cover PayPal\'s fees.', show: 'add-funds' },
  { icon: <BadgeCheck className="size-4" />, title: 'How payment works', body: 'Creators are paid per 1,000 verified views, from your balance, only as the views are checked. Views we cannot verify are never paid.', link: { label: 'See the history', href: '/brand/balance' } },
]

/**
 * Shown once, when the first submission ever arrives on a client's campaigns: everything they can do with it, and a "Show me"
 * that lights up the real control. The server decides when; it is saved as seen the moment it opens.
 */
export function FirstSubmissionGuide() {
  const on = useFeature('client-tour')
  const mounted = useMounted()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!on || firstSubSeenHere() || tourRunning()) return
    // one beat after the page lands, so it does not arrive with the page
    const t = window.setTimeout(() => {
      setOpen(true)
      rememberSeen('first-submission')
    }, 600)
    return () => window.clearTimeout(t)
  }, [on])

  if (!on || !mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <Guide
          key="guide"
          onClose={() => setOpen(false)}
          onShow={(s) => {
            setOpen(false)
            // let the dialog hand focus back before the spotlight takes it
            window.setTimeout(() => startTour([s]), 220)
          }}
        />
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Guide({ onClose, onShow }: { onClose: () => void; onShow: (s: StepId) => void }) {
  const { reduced } = useMotionPrefs()
  const box = useDialog<HTMLDivElement>(true, onClose)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }} className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 sm:items-center sm:p-4" onClick={onClose}>
      <motion.div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-sub-title"
        initial={reduced ? false : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 14, transition: { duration: 0.16 } }}
        transition={SPRING_POP}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[calc(1.25rem*var(--round,1))] border border-white/12 bg-gradient-to-b from-[#17171b] to-[#0b0b0d] pb-[env(safe-area-inset-bottom)] sm:rounded-card sm:pb-0"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 md:px-8 md:pt-8">
          <div>
            <p className="text-xs text-mute">Your first submission is in</p>
            <h2 id="first-sub-title" className="mt-1 font-display text-3xl leading-tight tracking-[-0.02em]">
              Here is what you can do
            </h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-pill text-mute hover:bg-white/10 hover:text-paper">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <ul className="no-scrollbar mt-4 min-h-0 flex-1 divide-y divide-line overflow-y-auto px-6 md:px-8">
          {ITEMS.map((it) => (
            <li key={it.title} className="flex gap-4 py-4">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-pill border border-line text-paper/70">
                {it.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">{it.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-mute">{it.body}</p>
              </div>
              {it.show ? (
                <button type="button" onClick={() => onShow(it.show!)} className="h-8 shrink-0 self-center rounded-pill bg-white/[0.06] px-3.5 text-xs text-paper transition-colors hover:bg-white/[0.12]">
                  Show me
                </button>
              ) : it.link ? (
                <Link href={it.link.href} onClick={onClose} className="shrink-0 self-center text-xs text-mute underline underline-offset-4 hover:text-paper">
                  {it.link.label}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="flex justify-end border-t border-line px-6 py-4 md:px-8">
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center rounded-pill bg-paper px-6 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
            Got it
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
