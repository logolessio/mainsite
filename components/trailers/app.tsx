'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { AccountView } from './account'
import { type View, Nav } from './nav'
import { Onboarding } from './onboarding'
import { SettingsView } from './settings'
import { Spotlight } from './spotlight'
import { api, TrailersProvider } from './ctx'
import { EASE, Mark, Toasts, useDesktop } from './ui'
import { WatchView } from './watch'
import { type Clip, type Profile } from '@/lib/trailers/types'

type Me = { signedIn: boolean; name: string | null; profile: Profile | null }

function Splash() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-black">
      <Mark />
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.4, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="h-px w-24 bg-paper/50" />
    </div>
  )
}

function ComputersOnly() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-black px-10 text-center">
      <Mark />
      <div className="max-w-md">
        <h1 className="font-display text-[3.2rem] leading-[1.05]">Best on a computer.</h1>
        <p className="mt-5 text-[17px] leading-relaxed text-paper/60">Trailers is made for a big screen and a mouse or trackpad. Open it on a computer to see it properly.</p>
      </div>
    </div>
  )
}

function Main({ profile, onRestart }: { profile: Profile; onRestart: () => void }) {
  const [view, setView] = useState<View>('watch')
  const [search, setSearch] = useState(false)
  const [jump, setJump] = useState<Clip | null>(null)
  const [where, setWhere] = useState(false)

  // ⌘K (or Ctrl K) opens the search from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearch((s) => !s)
      } else if (e.key === 'Escape' && view !== 'watch' && !search) setView('watch')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, search])

  const open = useCallback((c: Clip) => {
    setJump(c)
    setView('watch')
  }, [])

  void profile
  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-paper">
      <WatchView suspended={view !== 'watch' || search} jump={jump} onJumped={() => setJump(null)} whereOpen={where} setWhereOpen={setWhere} />
      <AnimatePresence mode="wait">
        {view !== 'watch' && (
          <motion.div key={view} initial={{ opacity: 0, y: 30, scale: 0.985, filter: 'blur(18px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -14, filter: 'blur(10px)', transition: { duration: 0.22 } }} transition={{ duration: 0.65, ease: EASE }} className="absolute inset-0 z-30 bg-black/[0.82] backdrop-blur-[34px]">
            {view === 'account' ? <AccountView onOpen={open} /> : <SettingsView onRestart={onRestart} />}
          </motion.div>
        )}
      </AnimatePresence>
      <Mark />
      <Nav view={view} onChange={setView} onSearch={() => setSearch(true)} />
      <Spotlight open={search} onClose={() => setSearch(false)} onOpen={open} onView={setView} />
      <Toasts />
    </div>
  )
}

/** The whole trailers site: setting up if you are new, then the trailers, your page and your settings. */
export function TrailersApp() {
  const desktop = useDesktop()
  const [me, setMe] = useState<Me | null>(null)
  const [redo, setRedo] = useState(false)

  const load = useCallback(async () => {
    try {
      setMe(await api<Me>('/api/trailers/me'))
    } catch {
      setMe({ signedIn: false, name: null, profile: null })
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  if (desktop === null || !me) return <Splash />
  if (!desktop) return <ComputersOnly />

  if (!me.profile || redo) {
    return (
      <>
        <Onboarding
          signedIn={me.signedIn}
          name={me.name}
          redo={redo}
          current={me.profile}
          onDone={(p) => {
            setRedo(false)
            setMe({ ...me, signedIn: true, profile: p })
          }}
        />
      </>
    )
  }
  return (
    <TrailersProvider profile={me.profile}>
      <Main profile={me.profile} onRestart={() => setRedo(true)} />
    </TrailersProvider>
  )
}
