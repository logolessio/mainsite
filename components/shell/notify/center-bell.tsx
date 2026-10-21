'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bell, Maximize2, Settings2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { useNavUser } from '../nav-user'
import { useNotes } from '../notifications'
import { TransitionLink } from '../transition-link'
import { CenterEmpty, CenterFeed, CenterSkeleton } from './center-feed'

/**
 * The bell, notification-centre style. It rings (a swing and a soft ripple) when it is pressed and whenever something new arrives.
 * The panel holds only the notifications: no heading, no tabs, no words. Two small icons at the foot open the full page and its settings.
 */
export function CenterBell({ onNavigate, align = 'right' }: { onNavigate?: () => void; align?: 'left' | 'right' }) {
  const { user } = useNavUser()
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [ring, setRing] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const unread = user?.signedIn ? user.unread : 0
  const before = useRef(unread)
  const { notes, update, load } = useNotes(open)

  // something new: ring
  useEffect(() => {
    if (unread > before.current) setRing((r) => r + 1)
    before.current = unread
  }, [unread])
  // a new notification is also announced by the toasts; they ask the bell to ring
  useEffect(() => {
    const onRing = () => setRing((r) => r + 1)
    window.addEventListener('logoless:bell', onRing)
    return () => window.removeEventListener('logoless:bell', onRing)
  }, [])

  useEffect(() => {
    if (!open) return
    load()
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, load])

  const close = () => {
    setOpen(false)
    onNavigate?.()
  }

  return (
    <div ref={wrap} className="relative">
      <LiquidGlass
        as="button"
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setRing((r) => r + 1)
          setOpen((v) => !v)
        }}
        className="grid size-11 place-items-center transition-transform active:scale-95"
        look={{ zRadius: 12 }}
      >
        <motion.span
          key={ring}
          animate={ring && !reduced ? { rotate: [0, -20, 16, -11, 7, -3, 0] } : {}}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="grid origin-[50%_12%] place-items-center"
        >
          <Bell className="size-[18px]" />
        </motion.span>
      </LiquidGlass>
      {/* the ripple and the badge sit outside the glass button: the glass clips anything that pokes past its edge */}
      <AnimatePresence>
        {ring > 0 && !reduced && (
          <motion.span key={`ring-${ring}`} aria-hidden="true" className="pointer-events-none absolute inset-0">
            {[0, 0.14].map((delay) => (
              <motion.span
                key={delay}
                initial={{ scale: 0.7, opacity: 0.5 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 0.85, delay, ease: EASE_OUT }}
                className="absolute inset-0 rounded-pill border border-paper/50"
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0.3 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 17 }}
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 -right-1 z-10 grid min-w-5 place-items-center rounded-pill bg-paper px-1 text-[10px] leading-5 font-semibold text-ink ring-2 ring-ink"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.94, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.97, filter: 'blur(2px)' }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className={cn(
              'absolute top-full z-50 mt-3 flex max-h-[min(32rem,76dvh)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[calc(26px*var(--round,1))] border border-white/[0.09] bg-[#0d0d10]/[0.97] shadow-[0_40px_90px_-24px_rgb(0_0_0/0.95)] backdrop-blur-xl',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {notes === null ? <CenterSkeleton /> : notes.length === 0 ? <CenterEmpty /> : <CenterFeed notes={notes} setNotes={update} onOpen={close} active={open} />}
            </div>
            <div className="flex shrink-0 justify-end gap-0.5 border-t border-white/[0.06] px-2 py-1.5">
              <TransitionLink href="/dashboard/notifications/settings" onClick={close} aria-label="Notification settings" title="Notification settings" className="grid size-8 place-items-center rounded-pill text-paper/40 transition-colors hover:bg-white/[0.07] hover:text-paper">
                <Settings2 aria-hidden="true" className="size-4" />
              </TransitionLink>
              <TransitionLink href="/dashboard/notifications" onClick={close} aria-label="All notifications" title="All notifications" className="grid size-8 place-items-center rounded-pill text-paper/40 transition-colors hover:bg-white/[0.07] hover:text-paper">
                <Maximize2 aria-hidden="true" className="size-4" />
              </TransitionLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
