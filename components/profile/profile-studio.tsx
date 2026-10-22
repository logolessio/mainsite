'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Download, ExternalLink, Image as ImageIcon, Pencil, X } from 'lucide-react'
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { NAV_USER_REFRESH } from '@/components/shell/nav-user'
import { UnsavedBar } from '@/components/ui/unsaved-bar'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { EASE_OUT } from '@/lib/layout'
import type { ProfileExtras } from '@/lib/profile-extras'
import { CLIPPING_PLATFORMS, LINK_PLATFORMS, type ProfileView } from '@/lib/profile-style'
import { toast } from '@/lib/toast'
import { ProfileCard, type EditTarget } from './profile-card'
import { ProfileBackdrop } from './profile-backdrop'
import { AvatarPanel, BackgroundPanel, BadgesPanel, BannerPanel, CardPanel, type Studio } from './studio-panels'
import { AboutPanel, AccountsPanel, ImportPanel, NamePanel, PrivacyPanel } from './studio-text-panels'

type Loaded = { profile: ProfileView; unlocked: string[]; discordImport: boolean; discordLinked: boolean }
type Panel = EditTarget | 'import'

async function api<T>(path: string, method: string, data?: unknown): Promise<T> {
  const res = await fetch(path, { method, headers: data ? { 'content-type': 'application/json' } : undefined, body: data ? JSON.stringify(data) : undefined })
  const j = (await res.json().catch(() => null)) as ({ error?: string } & T) | null
  if (!res.ok) throw new Error(j?.error ?? 'Something went wrong. Please try again.')
  return j as T
}

const PANEL_TITLE: Record<Panel, string> = {
  avatar: 'Profile picture',
  banner: 'Banner',
  card: 'Card colours and effect',
  badges: 'Badges',
  background: 'Page background',
  name: 'Your name',
  about: 'About you',
  privacy: 'Who sees what',
  accounts: 'Your accounts',
  import: 'Import from Discord',
}

function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia('(min-width: 1280px)')
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia('(min-width: 1280px)').matches,
    () => true,
  )
}

/**
 * The profile editor is the profile. Your page is shown as it really looks and everything on it can be clicked: the picture, the banner,
 * your name, your bio, the badges, the colours and the background. A click opens a small window with only that part's choices, and the
 * page stays in view beside it, changing as you choose.
 */
export function ProfileStudio() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [f, setF] = useState<ProfileView | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingAvatar, setPendingAvatar] = useState<string | null | undefined>(undefined)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [busy, setBusy] = useState(false)
  const wide = useWide()
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api<Loaded>('/api/me/profile', 'GET')
      .then((j) => {
        setLoaded(j)
        setF(j.profile)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  // badges save straight away, so the saved copy follows them and they never count as unsaved
  useEffect(() => {
    const on = (e: Event) => setLoaded((l) => (l ? { ...l, profile: { ...l.profile, badges: (e as CustomEvent<string[]>).detail } } : l))
    window.addEventListener('logoless:badges-saved', on)
    return () => window.removeEventListener('logoless:badges-saved', on)
  }, [])

  // errors show once, from the bottom, like every other message
  useEffect(() => {
    if (error && f) toast.error(error)
  }, [error, f])

  const ex = useCallback(<K extends keyof ProfileExtras>(k: K, patch: Partial<ProfileExtras[K]>) => setF((c) => (c ? { ...c, extras: { ...c.extras, [k]: { ...c.extras[k], ...patch } } } : c)), [])

  // compared again only when the profile itself changes, not on every render
  const dirty = useMemo(() => Boolean(f && loaded && (pendingAvatar !== undefined || JSON.stringify(f) !== JSON.stringify(loaded.profile))), [f, loaded, pendingAvatar])
  // the live preview follows the profile a moment behind: the fields you are typing in or dragging stay instant, and the heavy part (the card, its effects and the
  // background) is drawn when there is time, so a slider never has to wait for it
  const deferred = useDeferredValue(f)

  const save = async (): Promise<boolean> => {
    if (!f) return false
    setSaving(true)
    setError('')
    try {
      const bannerValue = f.bannerKind === 'image' ? f.banner.replace('/api/img/', '') : f.banner
      const res = await api<{ profile: ProfileView; newBadges: string[] }>('/api/me/profile', 'PUT', {
        handle: f.handle,
        displayName: f.displayName,
        pronouns: f.pronouns,
        bio: f.bio,
        country: f.country,
        bannerKind: f.bannerKind,
        banner: bannerValue,
        dotColor: f.dotColor,
        accent: f.accent,
        accent2: f.accent2,
        font: f.font,
        nameEffect: f.nameEffect,
        cardEffect: f.cardEffect,
        effectIntensity: f.effectIntensity,
        effectSpeed: f.effectSpeed,
        show: f.show,
        extras: f.extras,
        ...(pendingAvatar !== undefined ? { avatar: pendingAvatar } : {}),
      })
      setF(res.profile)
      setLoaded((l) => (l ? { ...l, profile: res.profile } : l))
      setPendingAvatar(undefined)
      window.dispatchEvent(new Event(NAV_USER_REFRESH))
      const names = res.newBadges.map((id) => BADGE_BY_ID[id]?.name).filter(Boolean)
      // one confirmation only: the toast that rises from the bottom
      toast.ok(names.length ? `Saved. New badge${names.length > 1 ? 's' : ''}: ${names.join(', ')}` : 'Profile saved')
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
      return false
    } finally {
      setSaving(false)
    }
  }

  useUnsavedGuard(dirty, { onSave: save })

  const importDiscord = async () => {
    setBusy(true)
    try {
      const r = await api<{ displayName: string; avatar: string | null; banner: string | null; color: string | null }>('/api/me/import-discord', 'POST', {})
      setF((c) => {
        if (!c) return c
        const next: ProfileView = { ...c, displayName: r.displayName.slice(0, 40), extras: { ...c.extras, avatar: { ...c.extras.avatar, kind: 'image' }, banner: { ...c.extras.banner, gif: '' } } }
        if (r.avatar) next.avatar = `/api/img/${r.avatar}`
        if (r.banner) {
          next.bannerKind = 'image'
          next.banner = `/api/img/${r.banner}`
        } else if (r.color) {
          next.bannerKind = 'color'
          next.banner = r.color
        }
        if (r.color) next.accent = r.color
        return next
      })
      if (r.avatar) setPendingAvatar(r.avatar)
      toast('Imported from Discord. Check it over, then save.')
      setPanel(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import from Discord.')
    } finally {
      setBusy(false)
    }
  }

  const open = useCallback(
    (t: Panel) => {
      setPanel(t)
      // on a narrower screen the window rises from the bottom, so the page is brought to the top of the screen above it
      if (!wide) window.setTimeout(() => stage.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    },
    [wide],
  )

  // the old Privacy page now lives here: a link to #privacy opens it
  const ready = Boolean(f && loaded)
  useEffect(() => {
    if (ready && window.location.hash === '#privacy') setPanel('privacy')
  }, [ready])

  // Escape closes the window
  useEffect(() => {
    if (!panel) return
    const on = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [panel])

  if (!f || !loaded) return <StudioSkeleton error={error} />

  const s: Studio = {
    f,
    setF,
    ex,
    setPendingAvatar,
    onError: (m) => setError(m),
    handleSaved: (handle) => {
      setF((c) => (c ? { ...c, handle } : c))
      setLoaded((l) => (l ? { ...l, profile: { ...l.profile, handle } } : l))
      window.dispatchEvent(new Event(NAV_USER_REFRESH))
    },
  }
  const discard = () => {
    setF(loaded.profile)
    setPendingAvatar(undefined)
    setError('')
  }

  const body = panel && (
    <>
      {panel === 'avatar' && <AvatarPanel s={s} />}
      {panel === 'banner' && <BannerPanel s={s} />}
      {panel === 'card' && <CardPanel s={s} />}
      {panel === 'background' && <BackgroundPanel s={s} />}
      {panel === 'badges' && <BadgesPanel s={s} unlocked={loaded.unlocked} />}
      {panel === 'name' && <NamePanel s={s} />}
      {panel === 'about' && <AboutPanel s={s} />}
      {panel === 'privacy' && <PrivacyPanel s={s} />}
      {panel === 'accounts' && <AccountsPanel />}
      {panel === 'import' && <ImportPanel available={loaded.discordImport} linked={loaded.discordLinked} busy={busy} onImport={importDiscord} />}
    </>
  )

  return (
    <div className="pb-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-[15px] text-mute">Click anything on your page to change it.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => open('import')} className="inline-flex h-9 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm text-mute transition-colors hover:border-paper/40 hover:text-paper">
            <Download aria-hidden="true" className="size-4" /> Import from Discord
          </button>
          <button type="button" onClick={() => open('privacy')} className="inline-flex h-9 items-center rounded-pill border border-line-strong px-4 text-sm text-mute transition-colors hover:border-paper/40 hover:text-paper">
            Privacy
          </button>
          <a href={`/@${f.handle}`} className="inline-flex h-9 items-center gap-1.5 rounded-pill px-3 text-sm text-mute transition-colors hover:text-paper">
            View your page <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </div>

      {/* the page itself: it moves aside to make room for the window on a wide screen */}
      <div className={wide && panel ? 'transition-[padding] duration-500 xl:pr-[444px]' : 'transition-[padding] duration-500'}>
        <StudioPreview view={deferred ?? f} onEdit={open} stageRef={stage} />
        <p className="mt-3 text-center text-xs text-mute">The numbers on the card are examples.</p>
      </div>

      {/* wide screens: the window sits beside the page, so the page is always in view */}
      <AnimatePresence>
        {wide && panel && (
          <motion.aside
            key="window"
            role="dialog"
            aria-label={PANEL_TITLE[panel]}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.34, ease: EASE_OUT } }}
            exit={{ opacity: 0, x: 20, transition: { duration: 0.18 } }}
            className="fixed top-[92px] right-6 z-40 flex max-h-[calc(100dvh-92px-6rem)] w-[420px] flex-col overflow-hidden rounded-card border border-line-strong bg-[#0d0d0f] shadow-[0_40px_100px_-30px_rgb(0_0_0/0.95)]"
          >
            <WindowHeader title={PANEL_TITLE[panel]} onClose={() => setPanel(null)} />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{body}</div>
            <div className="border-t border-line p-3">
              <button type="button" onClick={() => setPanel(null)} className="h-11 w-full rounded-pill bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper/85">
                Done
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* narrower screens: the window rises from the bottom, leaving the page above it in view */}
      <AnimatePresence>
        {!wide && panel && (
          <>
            <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPanel(null)} className="fixed inset-0 z-[80] bg-black/40" />
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label={PANEL_TITLE[panel]}
              initial={{ y: '100%' }}
              animate={{ y: 0, transition: { duration: 0.38, ease: EASE_OUT } }}
              exit={{ y: '100%', transition: { duration: 0.22 } }}
              className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[58dvh] w-full max-w-2xl flex-col rounded-t-[calc(1.25rem*var(--round,1))] border border-b-0 border-line-strong bg-[#0b0b0d] shadow-[0_-30px_60px_-20px_rgb(0_0_0/0.9)]"
            >
              <span aria-hidden="true" className="mx-auto mt-3 block h-1 w-10 rounded-pill bg-white/25" />
              <WindowHeader title={PANEL_TITLE[panel]} onClose={() => setPanel(null)} />
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">{body}</div>
              <div className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button type="button" onClick={() => setPanel(null)} className="h-11 w-full rounded-pill bg-paper text-sm font-medium text-ink">
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* only there when there is something to save */}
      <UnsavedBar show={dirty || saving} saving={saving} onReset={discard} onSave={() => void save()} />
    </div>
  )
}

function WindowHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-2 px-5 pt-4 pb-4">
      <h2 className="flex-1 font-sans text-[17px] font-medium">{title}</h2>
      <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-pill text-mute transition-colors hover:bg-white/10 hover:text-paper">
        <X className="size-4" />
      </button>
    </div>
  )
}

function StudioSkeleton({ error }: { error: string }) {
  if (error) return <p className="text-mute">{error}</p>
  return <div role="status" aria-busy="true" aria-label="Loading" className="sk h-[640px] rounded-card border border-line bg-white/[0.03]" />
}

/**
 * The page as people will see it: the backdrop, the Background button and the card. It is a piece of its own that only draws again when the (deferred)
 * profile or the way to open a window changes, never because something else in the editor did (a window opening, a save, a message).
 */
const StudioPreview = memo(function StudioPreview({ view, onEdit, stageRef }: { view: ProfileView; onEdit: (t: Panel) => void; stageRef: React.RefObject<HTMLDivElement | null> }) {
  const links = useMemo(
    () =>
      view.links
        .filter((l) => CLIPPING_PLATFORMS.includes(l.platform) && !view.extras.privacy.hiddenLinks.includes(l.platform))
        .map((l) => ({ platform: l.platform, href: l.url, label: LINK_PLATFORMS.find((p) => p.id === l.platform)?.label ?? l.platform })),
    [view.links, view.extras.privacy.hiddenLinks],
  )
  const stats = useMemo(
    () => ({ ...(view.show.clips ? { clips: 12 } : {}), ...(view.show.views ? { views: 48200 } : {}), ...(view.show.earnings ? { earnedCents: 32000 } : {}), ...(view.show.campaigns ? { campaigns: 4 } : {}) }),
    [view.show.clips, view.show.views, view.show.earnings, view.show.campaigns],
  )
  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-black">
      <ProfileBackdrop scope="box" bg={view.extras.bg} overlay={view.extras.overlay} color={view.dotColor} accents={[view.accent, view.accent2]} />
      <button type="button" onClick={() => onEdit('background')} className="absolute top-3 left-3 z-30 inline-flex h-9 items-center gap-1.5 rounded-pill border border-white/25 bg-black/65 px-3 text-xs text-white backdrop-blur-md transition-colors hover:bg-black/85">
        <ImageIcon aria-hidden="true" className="size-3.5" /> Background <Pencil aria-hidden="true" className="size-3" />
      </button>
      <div ref={stageRef} className="relative z-10 flex scroll-mt-5 justify-center px-3 pt-16 pb-12 sm:px-6 sm:pt-20">
        <ProfileCard preview isOwner studio className="w-full max-w-[480px]" onEdit={onEdit} view={view} stats={stats} links={links} />
      </div>
    </div>
  )
})
