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
    }),
    [profile, settings, toggle, patchSettings, toast, toasts],
  )
  return (
    <Ctx.Provider value={value}>
      <GlassProvider value={settings.glass}>{children}</GlassProvider>
    </Ctx.Provider>
  )
}
