'use client'

import { motion } from 'framer-motion'
import { Play, Settings, UserRound } from 'lucide-react'
import { BlobTabs } from '@/components/glass/blob'
import { GlassSurface } from '@/components/glass/glass'
import { EASE } from './ui'

export type View = 'watch' | 'account' | 'settings'

/** The floating bar at the bottom: your account, the trailers (the big play button), and the settings. A lens of glass slides between them. */
export function Nav({ view, onChange, onSearch }: { view: View; onChange: (v: View) => void; onSearch: () => void }) {
  return (
    <>
      <nav aria-label="Main" className="tr-ui pointer-events-none fixed inset-x-0 bottom-7 z-[70] flex justify-center"><motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 }} className="pointer-events-auto">
        <BlobTabs
          ariaLabel="Pages"
          value={view}
          onChange={(v) => onChange(v as View)}
          height={58}
          items={[
            { id: 'account', aria: 'Your account', icon: <UserRound className="size-[22px]" strokeWidth={1.7} />, className: 'w-[72px] px-0' },
            { id: 'watch', aria: 'Watch trailers', icon: <Play className="size-[24px] fill-current" strokeWidth={1.7} />, className: 'w-[104px] px-0' },
            { id: 'settings', aria: 'Settings', icon: <Settings className="size-[22px]" strokeWidth={1.7} />, className: 'w-[72px] px-0' },
          ]}
        />
      </motion.div></nav>
      <div className="tr-ui fixed right-8 bottom-9 z-[70] hidden lg:block">
      <motion.button type="button" onClick={onSearch} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.5 }} aria-label="Search movies" className="relative inline-flex h-11 items-center gap-2.5 rounded-full px-5 text-[13.5px] text-paper/80 outline-none focus-visible:ring-2 focus-visible:ring-paper/70">
        <GlassSurface shine flat className="pointer-events-none absolute inset-0" />
        <span className="relative z-10">Search</span>
        <kbd className="relative z-10 rounded-md bg-white/12 px-1.5 py-0.5 text-[12px] text-paper/70">⌘K</kbd>
      </motion.button>
      </div>
    </>
  )
}
