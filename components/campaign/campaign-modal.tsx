'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePreview } from '@/components/shell/preview-provider'
import { useMounted } from '@/hooks/use-motion-prefs'
import type { Campaign } from '@/lib/campaigns'
import { EASE_OUT } from '@/lib/layout'
import { CampaignSheet } from './campaign-sheet'

const Ctx = createContext<{ open: (c: Campaign) => void }>({ open: () => {} })
export const useCampaignModal = () => useContext(Ctx)

/** Opens a campaign as a centred sheet over whatever page you are on. Escape or a click outside closes it. */
export function CampaignModalProvider({ children }: { children: React.ReactNode }) {
  const mounted = useMounted()
  const pathname = usePathname()
  const { stop } = usePreview()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [backdrop, setBackdrop] = useState('')
  const panel = useRef<HTMLDivElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  const open = useCallback((c: Campaign) => {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setBackdrop('')
    setCampaign(c)
    // the picture the artist chose to show behind their campaign, if they chose one: it fades in when it has loaded
    fetch(`/api/campaigns/${encodeURIComponent(c.id)}/backdrop`)
      .then((r) => (r.ok ? r.json() : { background: '' }))
      .then((j: { background?: string }) => setBackdrop(/^[0-9a-f-]{36}$/.test(j.background ?? '') ? (j.background as string) : ''))
      .catch(() => {})
  }, [])
  const close = useCallback(() => {
    stop() // leaving a campaign ends its music
    setCampaign(null)
    returnTo.current?.focus()
  }, [stop])

  useEffect(() => {
    if (!campaign) return
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.dataset.modal = '1' // the dots behind it stop moving while it is open
    const t = window.setTimeout(() => panel.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close()
      if (e.key !== 'Tab' || !panel.current) return
      const f = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null)
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) (e.preventDefault(), last.focus())
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus())
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = prev
      delete document.documentElement.dataset.modal
    }
  }, [campaign, close])

  // following a link out of the sheet (campaign rules, a profile) takes you to that page, so the sheet must not stay behind
  useEffect(() => {
    setCampaign(null)
  }, [pathname])

  const value = useMemo(() => ({ open }), [open])
  return (
    <Ctx.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {campaign && (
              <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 p-3 md:p-6" onMouseDown={close}>
                {backdrop && (
                  <motion.div aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/img/${backdrop}`} alt="" className="size-full scale-110 object-cover opacity-55 blur-xl" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/55 to-black/80" />
                  </motion.div>
                )}
                <motion.div
                  ref={panel}
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${campaign.title} by ${campaign.creator}`}
                  tabIndex={-1}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.28, ease: EASE_OUT }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex w-full justify-center outline-none"
                >
                  <CampaignSheet campaign={campaign} onClose={close} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </Ctx.Provider>
  )
}
