'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, Download, ExternalLink, Image as ImageIcon, Loader2, Pencil, Shield, Undo2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ActionButton } from '@/components/app/ui'
import { BrandIcon } from '@/components/brand-icon'
import { NAV_USER_REFRESH } from '@/components/shell/nav-user'
import { Field, Input, Select, Textarea } from '@/components/ui/fields'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { EASE_OUT } from '@/lib/layout'
import { PROFILE_FONT_CLASS } from '@/lib/profile-fonts'
import type { ProfileExtras } from '@/lib/profile-extras'
import { CLIPPING_PLATFORMS, FONT_OPTIONS, LINK_PLATFORMS, NAME_EFFECTS, type ProfileView } from '@/lib/profile-style'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { nameSpeed, ProfileCard, type EditTarget } from './profile-card'
import { ProfileBackdrop } from './profile-backdrop'
import { Group, Slider, Tile } from './studio-controls'
import { AvatarPanel, BackgroundPanel, BadgesPanel, BannerPanel, CardPanel, type Studio } from './studio-panels'

type Loaded = { profile: ProfileView; unlocked: string[]; discordImport: boolean; discordLinked: boolean }

async function api<T>(path: string, method: string, data?: unknown): Promise<T> {
  const res = await fetch(path, { method, headers: data ? { 'content-type': 'application/json' } : undefined, body: data ? JSON.stringify(data) : undefined })
  const j = (await res.json().catch(() => null)) as ({ error?: string } & T) | null
  if (!res.ok) throw new Error(j?.error ?? 'Something went wrong. Please try again.')
  return j as T
}

const PANEL_TITLE: Record<EditTarget, string> = { avatar: 'Profile picture', banner: 'Banner', card: 'Card colours and effect', badges: 'Badges', background: 'Page background' }
/** Name effects that have a direction worth turning. */
const ANGLED = ['gradient', 'rainbow', 'chrome', 'shimmer']
/** Name effects that move, so a speed control means something. */
const MOVING = ['gradient', 'neon', 'glow', 'rainbow', 'chrome', 'glitch', 'shimmer']

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
 * The profile studio. A live preview of the real page sits beside (or above) the words: tap the pencil on the
 * picture, banner, card, badges or background to open just that part's controls. The main column holds only the
 * text: name, username, pronouns, bio, country, the name font and its effect.
 */
export function ProfileStudio() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [f, setF] = useState<ProfileView | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingAvatar, setPendingAvatar] = useState<string | null | undefined>(undefined)
  const [panel, setPanel] = useState<EditTarget | null>(null)
  const [discordOpen, setDiscordOpen] = useState(false)
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

  const set = useCallback(<K extends keyof ProfileView>(k: K, v: ProfileView[K]) => setF((cur) => (cur ? { ...cur, [k]: v } : cur)), [])
  const ex = useCallback(<K extends keyof ProfileExtras>(k: K, patch: Partial<ProfileExtras[K]>) => setF((c) => (c ? { ...c, extras: { ...c.extras, [k]: { ...c.extras[k], ...patch } } } : c)), [])

  const dirty = Boolean(f && loaded && (pendingAvatar !== undefined || JSON.stringify(f) !== JSON.stringify(loaded.profile)))

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import from Discord.')
    } finally {
      setBusy(false)
    }
  }

  const open = (t: EditTarget) => {
    setPanel(t)
    // after the sheet has started to open, so nothing else moves the page in the same moment
    if (!wide) window.setTimeout(() => stage.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  // Escape closes a panel
  useEffect(() => {
    if (!panel) return
    const on = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [panel])

  if (!f || !loaded) return <StudioSkeleton error={error} />

  const s: Studio = { f, setF, ex, setPendingAvatar, onError: (m) => setError(m) }
  const previewLinks = f.links
    .filter((l) => CLIPPING_PLATFORMS.includes(l.platform) && !f.extras.privacy.hiddenLinks.includes(l.platform))
    .map((l) => ({ platform: l.platform, href: l.url, label: LINK_PLATFORMS.find((p) => p.id === l.platform)?.label ?? l.platform }))
  const nameVars = { ['--na' as string]: f.accent, ['--nb' as string]: f.accent2, ['--nx-i' as string]: String(f.extras.name.intensity / 50), ['--nx-sp' as string]: String(nameSpeed(f.extras.name.speed)), ['--nx-ang' as string]: `${f.extras.name.angle}deg` }
  const discard = () => {
    setF(loaded.profile)
    setPendingAvatar(undefined)
    setError('')
  }

  const panelBody = panel && (
    <>
      {panel === 'avatar' && <AvatarPanel s={s} />}
      {panel === 'banner' && <BannerPanel s={s} />}
      {panel === 'card' && <CardPanel s={s} />}
      {panel === 'background' && <BackgroundPanel s={s} />}
      {panel === 'badges' && <BadgesPanel s={s} unlocked={loaded.unlocked} />}
    </>
  )

  const textSide = (
    <div className="grid gap-7">
      <Group title="About you">
        <div className="grid gap-4">
          <Field label="Display name">
            <Input value={f.displayName} maxLength={40} onChange={(e) => set('displayName', e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username" hint={`logoless.io/@${f.handle}`}>
              <Input value={f.handle} maxLength={20} onChange={(e) => set('handle', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
            </Field>
            <Field label="Pronouns (optional)">
              <Input value={f.pronouns} maxLength={30} placeholder="e.g. she/her" onChange={(e) => set('pronouns', e.target.value)} />
            </Field>
          </div>
          <Field label="About me" hint={`${f.bio.length}/400`}>
            <Textarea value={f.bio} maxLength={400} rows={4} onChange={(e) => set('bio', e.target.value)} />
          </Field>
          <Field label="Country (optional)">
            <Select value={f.country ?? ''} onChange={(e) => set('country', e.target.value || null)}>
              <option value="">Prefer not to say</option>
              {['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'SG', 'NL', 'SE', 'BR', 'IN', 'NG', 'ZA', 'PH', 'ID', 'MX', 'JP', 'KR'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Group>

      <Group title="Name font" hint="Shown with your own name">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FONT_OPTIONS.map((o) => (
            <Tile key={o.id} on={f.font === o.id} onClick={() => set('font', o.id)} className="px-3 py-2.5 text-left">
              <span className={cn('block truncate pr-4 text-lg leading-tight text-paper', PROFILE_FONT_CLASS[o.id])}>{f.displayName || o.label}</span>
              <span className="block text-[11px]">{o.label}</span>
            </Tile>
          ))}
        </div>
      </Group>

      <Group title="Name effect">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {NAME_EFFECTS.map((o) => (
            <Tile key={o.id} on={f.nameEffect === o.id} onClick={() => set('nameEffect', o.id)} className="px-2 py-2.5 text-center">
              <span style={nameVars} className={cn('mx-auto block w-fit text-base font-bold text-paper', `nx-${o.id}`)}>
                Aa
              </span>
              <span className="block text-[11px]">{o.label}</span>
            </Tile>
          ))}
        </div>
        {f.nameEffect !== 'solid' && (
          <div className="mt-4 grid gap-4 rounded-2xl border border-line bg-ink/50 p-4">
            <Slider label="Intensity" hint="How strong the effect is" value={f.extras.name.intensity} onChange={(intensity) => ex('name', { intensity })} normal={50} />
            {MOVING.includes(f.nameEffect) && <Slider label="Speed" hint="How fast it moves" value={f.extras.name.speed} onChange={(speed) => ex('name', { speed })} normal={50} />}
            {ANGLED.includes(f.nameEffect) && <Slider label="Direction" value={f.extras.name.angle} min={0} max={360} step={5} unit="°" onChange={(angle) => ex('name', { angle })} normal={90} />}
            <p className="text-xs text-mute">Colours come from your card colours (open the card with its pencil).</p>
          </div>
        )}
      </Group>

      <div className="rounded-2xl border border-line">
        <button type="button" onClick={() => setDiscordOpen((v) => !v)} aria-expanded={discordOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
          <BrandIcon name="discord" className="size-5" />
          <span className="flex-1 text-sm">
            Import from Discord<span className="block text-xs text-mute">Bring your picture, banner, colour and name across</span>
          </span>
          <ChevronDown className={cn('size-4 text-mute transition-transform', discordOpen && 'rotate-180')} />
        </button>
        <AnimatePresence initial={false}>
          {discordOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="border-t border-line p-4">
                {!loaded.discordImport ? (
                  <p className="rounded-xl border border-line bg-ink/60 p-3 text-xs text-mute">This is not switched on yet.</p>
                ) : !loaded.discordLinked ? (
                  <a href="/api/discord/connect?back=/dashboard/profile" className="inline-flex h-10 items-center rounded-pill bg-paper px-5 text-sm font-medium text-ink hover:bg-paper/85">
                    Connect Discord first
                  </a>
                ) : (
                  <ActionButton onClick={importDiscord} disabled={busy} className="rounded-pill">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Import from my Discord
                  </ActionButton>
                )}
                <p className="mt-3 text-xs leading-snug text-mute">Discord does not share your “About me” or connections, so add those yourself.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <a href="/dashboard/profile/privacy" className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3.5 transition-colors hover:bg-white/[0.03]">
        <Shield className="size-5 text-mute" />
        <span className="flex-1 text-sm">
          Privacy<span className="block text-xs text-mute">Choose who sees your page, your numbers and each account</span>
        </span>
        <ExternalLink className="size-4 text-mute" />
      </a>
    </div>
  )

  const preview = (
    <div>
      <div className="mb-3 flex items-center justify-between font-mono text-xs text-mute">
        <span>Live preview · tap a pencil to edit</span>
        <span className="hidden sm:inline">Example numbers</span>
      </div>
      <div className="relative overflow-hidden rounded-[calc(28px*var(--round,1))] border border-line bg-black">
        <ProfileBackdrop scope="box" bg={f.extras.bg} overlay={f.extras.overlay} color={f.dotColor} accents={[f.accent, f.accent2]} />
        <button type="button" onClick={() => open('background')} className="absolute top-3 left-3 z-30 inline-flex h-9 items-center gap-1.5 rounded-pill border border-white/25 bg-black/65 px-3 text-xs text-white backdrop-blur-md transition-colors hover:bg-black/85">
          <ImageIcon className="size-3.5" /> Background <Pencil className="size-3" />
        </button>
        <div ref={stage} className="relative z-10 flex scroll-mt-5 justify-center px-3 pt-16 pb-8 sm:px-6">
          <ProfileCard
            preview
            isOwner
            studio
            className="w-full max-w-[440px]"
            onEdit={open}
            view={f}
            stats={{ ...(f.show.clips ? { clips: 12 } : {}), ...(f.show.views ? { views: 48200 } : {}), ...(f.show.earnings ? { earnedCents: 32000 } : {}), ...(f.show.campaigns ? { campaigns: 4 } : {}) }}
            links={previewLinks}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="pb-6">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        {/* left: the words, or (on wide screens) the open panel in their place, so the preview stays in view */}
        <div className="order-2 min-w-0 xl:order-1">
          <AnimatePresence mode="wait" initial={false}>
            {wide && panel ? (
              <motion.div key={`panel-${panel}`} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.22, ease: EASE_OUT }} className="rounded-[calc(2rem*var(--round,1))] border border-line bg-[#0a0a0b] p-5 sm:p-7">
                <PanelHeader title={PANEL_TITLE[panel]} onClose={() => setPanel(null)} back />
                {panelBody}
              </motion.div>
            ) : (
              <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="rounded-[calc(2rem*var(--round,1))] border border-line bg-[#0a0a0b] p-5 sm:p-7">
                {textSide}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="order-1 min-w-0 xl:sticky xl:top-[96px] xl:order-2 xl:self-start">{preview}</div>
      </div>

      {/* narrower screens: the panel rises from the bottom, leaving the preview above it in view */}
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
              className="fixed inset-x-0 bottom-0 z-[81] mx-auto max-h-[58dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-[28px] border border-b-0 border-line-strong bg-[#0b0b0d] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-30px_60px_-20px_rgb(0_0_0/0.9)]"
            >
              <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-10 rounded-pill bg-white/25" />
              <PanelHeader title={PANEL_TITLE[panel]} onClose={() => setPanel(null)} />
              {panelBody}
              <button type="button" onClick={() => setPanel(null)} className="mt-6 h-11 w-full rounded-pill bg-paper text-sm font-medium text-ink">
                Done
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---------- save bar ---------- */}
      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 md:bottom-4 mt-6 rounded-3xl border border-line-strong bg-surface/95 p-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-1.5">
          <ActionButton data-hotkey-save onClick={() => void save()} disabled={saving || !dirty} className="rounded-pill">
            {saving && <Loader2 className="size-4 animate-spin" />} Save profile
          </ActionButton>
          {dirty && (
            <button type="button" onClick={discard} className="inline-flex h-10 items-center gap-1.5 rounded-pill px-3 text-sm text-mute hover:text-paper">
              <Undo2 className="size-4" /> Discard
            </button>
          )}
          <span className="flex items-center gap-2 text-xs text-mute">
            <span className={cn('size-2 rounded-pill', dirty ? 'bg-amber-300' : 'bg-emerald-400')} />
            {dirty ? 'Unsaved changes' : 'All saved'}
          </span>
          <a href={`/@${f.handle}`} className="ml-auto pr-2 text-sm text-mute hover:text-paper">
            View public page
          </a>
        </div>
      </div>
    </div>
  )
}

function PanelHeader({ title, onClose, back }: { title: string; onClose: () => void; back?: boolean }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      {back && (
        <button type="button" onClick={onClose} aria-label="Back to the text" className="-ml-2 grid size-9 place-items-center rounded-pill text-mute hover:bg-white/10 hover:text-paper">
          <ArrowLeft className="size-4" />
        </button>
      )}
      <h2 className="flex-1 text-[17px] font-medium">{title}</h2>
      <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-pill text-mute hover:bg-white/10 hover:text-paper">
        <X className="size-4" />
      </button>
    </div>
  )
}

function StudioSkeleton({ error }: { error: string }) {
  if (error) return <p className="text-mute">{error}</p>
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="grid gap-8 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
      <div className="sk order-2 h-[640px] rounded-[2rem] border border-line bg-white/[0.03] xl:order-1" />
      <div className="sk order-1 h-[560px] rounded-[28px] border border-line bg-white/[0.03] xl:order-2" />
    </div>
  )
}
