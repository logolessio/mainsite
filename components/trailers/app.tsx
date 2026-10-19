'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { AccountView } from './account'
import { type View, Nav } from './nav'
import { Onboarding } from './onboarding'
import { PersonView } from './person'
import { SettingsView } from './settings'
import { Spotlight } from './spotlight'
import { api, TrailersProvider, useTrailers } from './ctx'
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
        <p className="mt-5 text-[17px] leading-relaxed text-paper/60">scroll is made for a big screen and a mouse or trackpad. Open it on a computer to see it properly.</p>
      </div>
    </div>
  )
}

function Main({ profile, onRestart }: { profile: Profile; onRestart: () => void }) {
  const { lite, toast } = useTrailers()
  const [view, setView] = useState<View>('watch')
  const [search, setSearch] = useState(false)
  const [jump, setJump] = useState<Clip | null>(null)
  const [where, setWhere] = useState(false)
  const [person, setPerson] = useState<number | null>(null)

  // ⌘K (or Ctrl K) opens the search from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearch((s) => !s)
      } else if (e.key === 'Escape' && person !== null && !search) setPerson(null)
      else if (e.key === 'Escape' && view !== 'watch' && !search) setView('watch')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, search, person])

  const open = useCallback((c: Clip) => {
    setPerson(null)
    setJump(c)
    setView('watch')
  }, [])

  /** A film chosen on a person's page: fetch its trailer and play it. False if it has none. */
  const openMovie = useCallback(
    async (id: number) => {
      try {
        const r = await api<{ clip: Clip }>(`/api/trailers/movie/${id}`)
        open(r.clip)
        return true
      } catch (e) {
        toast(e instanceof Error ? e.message : 'No trailer for that one.')
        return false
      }
    },
    [open, toast],
  )

  void profile
  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-paper">
      <WatchView suspended={view !== 'watch' || search || person !== null} jump={jump} onJumped={() => setJump(null)} whereOpen={where} setWhereOpen={setWhere} onPerson={setPerson} />
      <AnimatePresence>
        {person !== null && view === 'watch' && (
          <motion.div key="person" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} transition={{ duration: lite ? 0.2 : 0.4, ease: EASE }} className="absolute inset-0 z-30">
            <PersonView id={person} onClose={() => setPerson(null)} onOpenMovie={openMovie} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {view !== 'watch' && (
          <motion.div
            key={view}
            initial={lite ? { opacity: 0, y: 20 } : { opacity: 0, y: 30, scale: 0.985, filter: 'blur(18px)' }}
            animate={lite ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={lite ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 0, y: -14, filter: 'blur(10px)', transition: { duration: 0.22 } }}
            transition={{ duration: lite ? 0.35 : 0.65, ease: EASE }}
            className={lite ? 'absolute inset-0 z-30 bg-black/[0.96]' : 'absolute inset-0 z-30 bg-black/[0.82] backdrop-blur-[34px]'}
          >
            {view === 'account' ? <AccountView onOpen={open} /> : <SettingsView onRestart={onRestart} />}
          </motion.div>
        )}
      </AnimatePresence>
      <Mark />
      <Nav view={view} onChange={(v) => { setPerson(null); setView(v) }} onSearch={() => setSearch(true)} />
      <Spotlight open={search} onClose={() => setSearch(false)} onOpen={open} onView={(v) => { setPerson(null); setView(v) }} />
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
  // told to the boot guard in app/trailers/layout.tsx: the page has started, and has got past its loading screen
  useEffect(() => {
    const h = document.documentElement
    h.setAttribute('data-scroll-state', `started; screen check ${desktop === null ? 'waiting' : desktop ? 'ok' : 'too small'}; account ${me ? 'loaded' : 'waiting'}`)
    if (desktop !== null && me) h.setAttribute('data-scroll-ready', '1')
  }, [desktop, me])

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
