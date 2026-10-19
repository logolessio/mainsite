'use client'

import { motion } from 'framer-motion'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { GlassMenu, GlassSlider, GlassSwitch } from '@/components/glass/blob'
import { GlassSurface } from '@/components/glass/glass'
import { REGIONS } from '@/lib/trailers/types'
import { api, useTrailers } from './ctx'
import { EASE, GButton } from './ui'

function Card({ title, children, i }: { title: string; children: React.ReactNode; i: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.7, ease: EASE, delay: 0.08 * i }}>
      <h2 className="mb-4 pl-2 font-display text-[1.7rem]">{title}</h2>
      <GlassSurface radius={34} className="w-full">
        <div className="relative z-10 divide-y divide-white/[0.08] px-8">{children}</div>
      </GlassSurface>
    </motion.section>
  )
}

function Line({ title, hint, children, wide }: { title: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-8 py-6">
      <div className="min-w-0">
        <p className="text-[17px]">{title}</p>
        {hint && <p className="mt-1 max-w-sm text-[13.5px] leading-snug text-paper/50">{hint}</p>}
      </div>
      <div className={wide ? 'w-[300px] shrink-0' : 'shrink-0'}>{children}</div>
    </div>
  )
}

const KEYS: [string, string][] = [['↓  ↑   or   J  K', 'Next and previous trailer'], ['Space', 'Pause or play'], ['L', 'Like'], ['S', 'Save'], ['W', 'Where to watch'], ['M', 'Sound on or off'], ['F', 'Full screen'], ['⌘ K', 'Search']]

export function SettingsView({ onRestart }: { onRestart: () => void }) {
  const { profile, settings, patchSettings, setProfile, toast } = useTrailers()
  const [name, setName] = useState(profile?.name ?? '')
  const [saving, setSaving] = useState(false)
  if (!profile) return null

  const saveName = async () => {
    if (!name.trim() || name.trim() === profile.name) return
    setSaving(true)
    try {
      const r = await api<{ profile: typeof profile }>('/api/trailers/me', { body: { op: 'name', name: name.trim() } })
      setProfile(r.profile)
      toast('Saved')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save that.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="absolute inset-0 overflow-y-auto [scrollbar-width:none]">
      <div className="mx-auto flex max-w-[780px] flex-col gap-12 px-10 pt-36 pb-44">
        <motion.h1 initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.8, ease: EASE }} className="font-display text-[clamp(3rem,5vw,4.8rem)] leading-none">
          Settings
        </motion.h1>

        <Card title="Playback" i={1}>
          <Line title="Start with sound" hint="Trailers begin with the sound on. Your browser may keep it off until you have clicked somewhere on the page.">
            <GlassSwitch ariaLabel="Start with sound" checked={settings.sound} onChange={(v) => void patchSettings({ sound: v })} />
          </Line>
          <Line title="Play the next one by itself" hint="When a trailer ends, scroll on to the next. Off, the trailer plays again.">
            <GlassSwitch ariaLabel="Play the next trailer by itself" checked={settings.autoNext} onChange={(v) => void patchSettings({ autoNext: v })} />
          </Line>
          <Line title="Glow of the film" hint="A soft wash of the film's colours behind the words.">
            <GlassSwitch ariaLabel="Glow of the film" checked={settings.ambient} onChange={(v) => void patchSettings({ ambient: v })} />
          </Line>
        </Card>

        <Card title="Where you watch" i={2}>
          <Line title="Country" hint="Which streaming services and shops we show under Where to watch.">
            <GlassMenu label="Country" value={settings.region} width={260} onChange={(r) => void patchSettings({ region: r })} options={REGIONS.map(([id, label]) => ({ id, label }))} />
          </Line>
        </Card>

        <Card title="Glass" i={3}>
          <Line title="How much the glass bends" hint="Drag it all the way down to turn the bending off, which is also easier on an older computer." wide>
            <GlassSlider ariaLabel="How much the glass bends" value={settings.glass} onChange={(v) => void patchSettings({ glass: v })} />
          </Line>
        </Card>

        <Card title="You" i={4}>
          <Line title="Name" hint="What we call you.">
            <div className="flex items-center gap-3">
              <GlassSurface shine flat className="h-12 w-52">
                <input data-bare value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} aria-label="Name" onKeyDown={(e) => e.key === 'Enter' && void saveName()} className="relative z-10 size-full bg-transparent px-5 text-[16px] outline-none" />
              </GlassSurface>
              <GButton size="sm" busy={saving} disabled={!name.trim() || name.trim() === profile.name} onClick={() => void saveName()}>Save</GButton>
            </div>
          </Line>
          <Line title="Username" hint="Where your page lives.">
            <span className="text-paper/70">@{profile.username}</span>
          </Line>
          <Line title="Your picks" hint="The movies we use to choose your trailers.">
            <GButton size="sm" onClick={onRestart}>Change them</GButton>
          </Line>
          <Line title="Sign out">
            <GButton size="sm" onClick={() => void signOut({ callbackUrl: '/trailers' })}>Sign out</GButton>
          </Line>
        </Card>

        <Card title="Keys" i={5}>
          {KEYS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between py-4">
              <span className="text-[15px] text-paper/70">{d}</span>
              <kbd className="rounded-lg bg-white/10 px-3 py-1.5 text-[13px] text-paper/80">{k}</kbd>
            </div>
          ))}
        </Card>

        <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="pl-2 text-[12.5px] leading-relaxed text-paper/40">
          <span className="mb-2 block text-[13px] font-semibold tracking-[0.18em] text-paper/60">TMDB</span>
          This product uses the TMDB API but is not endorsed or certified by TMDB. Where-to-watch information is provided by JustWatch. Trailers play from YouTube.
        </motion.footer>
      </div>
    </div>
  )
}
