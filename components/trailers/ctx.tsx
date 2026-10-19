'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { GlassProvider } from '@/components/glass/glass'
import { type Clip, DEFAULT_SETTINGS, type Mini, type Profile, type Settings } from '@/lib/trailers/types'

export type Toast = { id: number; text: string }

type Api = {
  profile: Profile | null
  settings: Settings
  liked: (id: number) => boolean
  saved: (id: number) => boolean
  toggle: (kind: 'like' | 'save', m: Mini) => Promise<void>
  patchSettings: (p: Partial<Settings>) => Promise<void>
  setProfile: (p: Profile | null) => void
  toast: (text: string) => void
  toasts: Toast[]
  /** the light way of drawing everything (simple glass, no blurs, a smaller video), chosen by the person or by the page struggling */
  lite: boolean
}

const Ctx = createContext<Api | null>(null)
export const useTrailers = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('TrailersProvider is missing')
  return c
}

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body ? 'POST' : 'GET'),
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.')
  return data
}

export const miniOf = (c: Clip): Mini => ({ id: c.id, t: c.title, p: c.poster, y: c.year, r: c.rating })

const weakComputer = () => {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  return (n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 4 || n.connection?.saveData === true || matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Whether this computer seems to need the light way of drawing. A computer with few cores or little memory, or one that asked for less motion,
 * says so at once; any other is watched for a few seconds after the page has settled, and if more than a third of its frames take longer than
 * about 34 ms it is switched over (and stays switched for this visit). Frames far apart (a hidden or background page) are not counted.
 */
function useStruggling(enabled: boolean, onSwitch: () => void) {
  const [struggling, setStruggling] = useState(false)
  const cb = useRef(onSwitch)
  cb.current = onSwitch
  useEffect(() => {
    if (!enabled) return
    try {
      if (sessionStorage.getItem('tr-lite') === '1') return setStruggling(true)
    } catch {
      /* no storage: just measure */
    }
    if (weakComputer()) return setStruggling(true)
    let raf = 0
    let last = 0
    let frames = 0
    let slow = 0
    const start = performance.now()
    const tick = (t: number) => {
      if (last) {
        const dt = t - last
        if (dt < 250) {
          frames++
          if (dt > 34) slow++
        }
      }
      last = t
      if (frames < 150 && performance.now() - start < 12000) raf = requestAnimationFrame(tick)
      else if (frames >= 80 && slow / frames > 0.35) {
        try {
          sessionStorage.setItem('tr-lite', '1')
        } catch {
          /* fine */
        }
        setStruggling(true)
        cb.current()
      }
    }
    const t = setTimeout(() => {
      raf = requestAnimationFrame(tick)
    }, 4000)
    return () => {
      clearTimeout(t)
      cancelAnimationFrame(raf)
    }
  }, [enabled])
  return struggling
}

/** What every part of the site shares: who is signed in, their lists and settings, and the little toasts. Lists change at once on screen and are saved behind. */
export function TrailersProvider({ profile: initial, children }: { profile: Profile | null; children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(initial)
  const [toasts, setToasts] = useState<Toast[]>([])
  const nid = useRef(0)
  useEffect(() => setProfile(initial), [initial])

  const toast = useCallback((text: string) => {
    const id = ++nid.current
    setToasts((t) => [...t.slice(-2), { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  const settings = profile?.settings ?? DEFAULT_SETTINGS
  const struggling = useStruggling(settings.perf === 'auto', () => toast('This computer seemed to be struggling, so the site switched to light mode. You can change that in Settings.'))
  const lite = settings.perf === 'light' || (settings.perf === 'auto' && struggling)

  const toggle = useCallback(
    async (kind: 'like' | 'save', m: Mini) => {
      if (!profile) return
      const key = kind === 'like' ? 'liked' : 'saved'
      const before = profile
      const has = profile[key].some((x) => x.id === m.id)
      setProfile({ ...profile, [key]: has ? profile[key].filter((x) => x.id !== m.id) : [m, ...profile[key]] })
      try {
        await api('/api/trailers/me', { body: { op: kind, movie: m } })
      } catch (e) {
        setProfile(before)
        toast(e instanceof Error ? e.message : 'Could not save that.')
      }
    },
    [profile, toast],
  )

  const patchSettings = useCallback(
    async (p: Partial<Settings>) => {
      if (!profile) return
      setProfile({ ...profile, settings: { ...profile.settings, ...p } })
      try {
        await api('/api/trailers/me', { body: { op: 'settings', patch: p } })
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not save that.')
      }
    },
    [profile, toast],
  )

  const value = useMemo<Api>(
    () => ({
      profile,
      settings,
      liked: (id) => Boolean(profile?.liked.some((m) => m.id === id)),
      saved: (id) => Boolean(profile?.saved.some((m) => m.id === id)),
      toggle,
      patchSettings,
      setProfile,
      toast,
      toasts,
      lite,
    }),
    [profile, settings, toggle, patchSettings, toast, toasts, lite],
  )
  return (
    <Ctx.Provider value={value}>
      <GlassProvider value={lite ? 0 : settings.glass}>{children}</GlassProvider>
    </Ctx.Provider>
  )
}
