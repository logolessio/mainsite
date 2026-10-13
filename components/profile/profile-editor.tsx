'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Ban, Binary, Bug, Camera, Check, ChevronDown, CircleDot, CloudRain, Download, Droplets, Eye, EyeOff, Film, Flame, Flower2, Globe, ImagePlus, Leaf, Link2, Loader2, Palette, PartyPopper, Pencil, Plus, Rocket, Search, Snowflake, Sparkles, Star, Sun, Trash2, Tv, Undo2, User, Waves, Wind, X, Zap, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionButton, Card, Toggle } from '@/components/app/ui'
import { BrandIcon } from '@/components/brand-icon'
import { NAV_USER_REFRESH } from '@/components/shell/nav-user'
import { Field, Input, Select, Textarea } from '@/components/ui/fields'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { uploadImage } from '@/lib/image-client'
import { EASE_OUT } from '@/lib/layout'
import { PROFILE_FONT_CLASS } from '@/lib/profile-fonts'
import {
  ACCENT_SWATCHES,
  BANNER_PRESETS,
  CARD_EFFECTS,
  DOT_SWATCHES,
  FONT_OPTIONS,
  LINK_GROUPS,
  buildLink,
  LINK_PLATFORMS,
  USERNAME_LINKS,
  usernameOf,
  MAX_LINKS,
  NAME_EFFECTS,
  SHOW_OPTIONS,
  type ProfileLink,
  type ProfileView,
  type ShowMap,
} from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import { bannerStyle, ProfileCard } from './profile-card'
import { MiniDots } from './mini-dots'
import { ProfileTheme } from './profile-theme'

type Loaded = { profile: ProfileView; unlocked: string[]; discordImport: boolean }

async function api<T>(path: string, method: string, data?: unknown): Promise<T> {
  const res = await fetch(path, { method, headers: data ? { 'content-type': 'application/json' } : undefined, body: data ? JSON.stringify(data) : undefined })
  const j = (await res.json().catch(() => null)) as ({ error?: string } & T) | null
  if (!res.ok) throw new Error(j?.error ?? 'Something went wrong. Please try again.')
  return j as T
}

const meta = (id: string) => LINK_PLATFORMS.find((p) => p.id === id)

export function ProfileEditor() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [f, setF] = useState<ProfileView | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'avatar' | 'banner' | 'discord' | null>(null)
  const [pendingAvatar, setPendingAvatar] = useState<string | null | undefined>(undefined)
  const [editing, setEditing] = useState<string | null>(null) // platform being edited
  const [discordId, setDiscordId] = useState('')
  const [tab, setTab] = useState<TabId>('profile')
  const [discordOpen, setDiscordOpen] = useState(false)
  const [q, setQ] = useState('')
  const avatarInput = useRef<HTMLInputElement>(null)
  const bannerInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api<Loaded>('/api/me/profile', 'GET')
      .then((j) => {
        setLoaded(j)
        setF(j.profile)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  const set = useCallback(<K extends keyof ProfileView>(k: K, v: ProfileView[K]) => setF((cur) => (cur ? { ...cur, [k]: v } : cur)), [])

  const upload = async (kind: 'avatar' | 'banner', file: File | undefined) => {
    if (!file) return
    setError('')
    setBusy(kind)
    try {
      const id = await uploadImage(kind, file)
      if (kind === 'avatar') {
        setPendingAvatar(id)
        set('avatar', `/api/img/${id}`)
      } else {
        setF((c) => (c ? { ...c, bannerKind: 'image', banner: `/api/img/${id}` } : c))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setBusy(null)
    }
  }

  const importDiscord = async () => {
    setBusy('discord')
    setError('')
    setNote('')
    try {
      const r = await api<{ displayName: string; avatar: string | null; banner: string | null; color: string | null }>('/api/me/import-discord', 'POST', { id: discordId.trim() })
      setF((c) => {
        if (!c) return c
        const next = { ...c, displayName: r.displayName.slice(0, 40) }
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
      setNote('Imported from Discord. Check it over, then press Save profile. Your “About me” text and connections can’t be fetched from Discord, so add those below.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import from Discord.')
    } finally {
      setBusy(null)
    }
  }

  const save = async () => {
    if (!f) return
    setSaving(true)
    setError('')
    setNote('')
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
        links: f.links,
        show: f.show,
        ...(pendingAvatar !== undefined ? { avatar: pendingAvatar } : {}),
      })
      setF(res.profile)
      setLoaded((l) => (l ? { ...l, profile: res.profile } : l))
      setPendingAvatar(undefined)
      window.dispatchEvent(new Event(NAV_USER_REFRESH))
      const names = res.newBadges.map((id) => BADGE_BY_ID[id]?.name).filter(Boolean)
      setNote(names.length ? `Saved. New badge${names.length > 1 ? 's' : ''}: ${names.join(', ')}` : 'Saved')
      setTimeout(() => setNote(''), 4500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const upsertLink = (l: ProfileLink) => setF((c) => (c ? { ...c, links: [...c.links.filter((x) => x.platform !== l.platform), l] } : c))
  const removeLink = (platform: string) => setF((c) => (c ? { ...c, links: c.links.filter((x) => x.platform !== platform) } : c))

  if (!f || !loaded) return <p className="text-mute">{error || 'Loading your profile…'}</p>

  const previewLinks = f.links.map((l) => ({ platform: l.platform, href: l.url, label: meta(l.platform)?.label ?? l.platform }))
  const nameVars = { ['--na' as string]: f.accent, ['--nb' as string]: f.accent2 }
  const dirty = pendingAvatar !== undefined || JSON.stringify(f) !== JSON.stringify(loaded.profile)
  const discard = () => {
    setF(loaded.profile)
    setPendingAvatar(undefined)
    setError('')
    setNote('')
  }
  const matches = (p: (typeof LINK_PLATFORMS)[number]) => !q.trim() || p.label.toLowerCase().includes(q.trim().toLowerCase())
  const tabs: { id: TabId; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'style', label: 'Style', icon: Palette },
    { id: 'effects', label: 'Effects', icon: Sparkles },
    { id: 'links', label: 'Links', icon: Link2, badge: f.links.length },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'preview', label: 'Preview', icon: Eye },
  ]

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,600px)_1fr]">
      <ProfileTheme dot={f.dotColor} />
      <div className="min-w-0">
        {/* ---------- the tab bar ---------- */}
        <div className="glass-liquid sticky top-[84px] z-20 mx-auto mb-6 w-fit max-w-full rounded-full">
        <div role="tablist" aria-label="Profile sections" className="no-scrollbar flex justify-center gap-1 overflow-x-auto overflow-y-hidden p-1.5">
          {tabs.map((t) => {
            const on = tab === t.id
            return (
              <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => setTab(t.id)} className={cn('relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition-colors', on ? 'text-ink' : 'text-mute hover:text-paper', t.id === 'preview' && 'xl:hidden')}>
                {on && <motion.span layoutId="profile-tab" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-paper" />}
                <t.icon className="relative size-4" />
                <span className="relative">{t.label}</span>
                {t.badge ? <span className={cn('relative rounded-full px-1.5 font-mono text-[10px]', on ? 'bg-ink/10' : 'bg-white/10')}>{t.badge}</span> : null}
              </button>
            )
          })}
        </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: EASE_OUT }} className={cn(tab !== 'preview' && 'rounded-[2rem] border border-line bg-[#0a0a0b] p-5 sm:p-7')}>
            {/* ================= PROFILE ================= */}
            {tab === 'profile' && (
              <div className="grid gap-7">
                <div className="flex items-center gap-5">
                  <button type="button" onClick={() => avatarInput.current?.click()} className="group relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-raised" aria-label="Change profile picture">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {f.avatar ? <img src={f.avatar} alt="" className="size-full object-cover" referrerPolicy="no-referrer" /> : <Camera className="size-6 text-mute" />}
                    <span className="absolute inset-0 grid place-items-center bg-ink/60 opacity-0 transition-opacity group-hover:opacity-100">{busy === 'avatar' ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}</span>
                  </button>
                  <input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => upload('avatar', e.target.files?.[0])} />
                  <div className="min-w-0 flex-1">
                    <Field label="Display name"><Input value={f.displayName} maxLength={40} onChange={(e) => set('displayName', e.target.value)} /></Field>
                    <button type="button" onClick={() => { setPendingAvatar(null); set('avatar', null) }} className="mt-2 inline-flex items-center gap-1 text-xs text-mute hover:text-paper">
                      <Trash2 className="size-3" /> Use my sign-in picture
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Username" hint={`logoless.io/@${f.handle}`}><Input value={f.handle} maxLength={20} onChange={(e) => set('handle', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} /></Field>
                  <Field label="Pronouns (optional)"><Input value={f.pronouns} maxLength={30} placeholder="e.g. she/her" onChange={(e) => set('pronouns', e.target.value)} /></Field>
                </div>
                <Field label="About me" hint={`${f.bio.length}/400`}><Textarea value={f.bio} maxLength={400} rows={4} onChange={(e) => set('bio', e.target.value)} /></Field>
                <Field label="Country (optional)">
                  <Select value={f.country ?? ''} onChange={(e) => set('country', e.target.value || null)}>
                    <option value="">Prefer not to say</option>
                    {['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'SG', 'NL', 'SE', 'BR', 'IN', 'NG', 'ZA', 'PH', 'ID', 'MX', 'JP', 'KR'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>

                <div className="rounded-2xl border border-line">
                  <button type="button" onClick={() => setDiscordOpen((v) => !v)} aria-expanded={discordOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                    <BrandIcon name="discord" className="size-5" />
                    <span className="flex-1 text-sm">Import from Discord<span className="block text-xs text-mute">Bring your picture, banner, colour and name across</span></span>
                    <ChevronDown className={cn('size-4 text-mute transition-transform', discordOpen && 'rotate-180')} />
                  </button>
                  <AnimatePresence initial={false}>
                    {discordOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="border-t border-line px-4 pt-4 pb-4">
                          {!loaded.discordImport && <p className="mb-3 rounded-xl border border-line bg-ink/60 p-3 text-xs text-mute">This is not switched on yet. The site owner needs to add a Discord bot token first.</p>}
                          <div className="flex flex-wrap gap-2">
                            <Input value={discordId} onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, '').slice(0, 22))} placeholder="Your Discord user ID" inputMode="numeric" className="max-w-xs flex-1" aria-label="Discord user ID" />
                            <ActionButton onClick={importDiscord} disabled={!loaded.discordImport || busy === 'discord' || discordId.length < 15} className="rounded-full">
                              {busy === 'discord' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Import
                            </ActionButton>
                          </div>
                          <p className="mt-3 text-xs leading-snug text-mute">Find your ID: Discord Settings, Advanced, turn on Developer Mode, then right-click your name and choose Copy User ID. Discord does not share your “About me” or connections, so add those yourself.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* ================= STYLE ================= */}
            {tab === 'style' && (
              <div className="grid gap-8">
                <Group title="Name font" hint="Shown with your own name">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {FONT_OPTIONS.map((o) => (
                      <button key={o.id} type="button" onClick={() => set('font', o.id)} aria-pressed={f.font === o.id} className={cn('rounded-xl border px-3 py-2.5 text-left transition-colors', f.font === o.id ? 'border-paper bg-paper/10' : 'border-line hover:bg-paper/5')}>
                        <span className={cn('block truncate text-lg leading-tight', PROFILE_FONT_CLASS[o.id])}>{f.displayName || o.label}</span>
                        <span className="block text-[11px] text-mute">{o.label}</span>
                      </button>
                    ))}
                  </div>
                </Group>
                <Group title="Name effect">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {NAME_EFFECTS.map((o) => (
                      <button key={o.id} type="button" onClick={() => set('nameEffect', o.id)} aria-pressed={f.nameEffect === o.id} className={cn('rounded-xl border px-2 py-2.5 text-center', f.nameEffect === o.id ? 'border-paper bg-paper/10' : 'border-line hover:bg-paper/5')}>
                        <span style={nameVars} className={cn('block text-base font-bold', `nx-${o.id}`, o.id === 'gradient' && 'mx-auto w-fit')}>Aa</span>
                        <span className="block text-[11px] text-mute">{o.label}</span>
                      </button>
                    ))}
                  </div>
                </Group>
                <Group title="Colours" hint="Your card is tinted with these">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Swatches label="Primary" value={f.accent} options={ACCENT_SWATCHES} onChange={(v) => set('accent', v)} />
                    <Swatches label="Accent" value={f.accent2} options={ACCENT_SWATCHES} onChange={(v) => set('accent2', v)} />
                  </div>
                </Group>
                <Group title="Banner">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {BANNER_PRESETS.map((b) => (
                      <button key={b.id} type="button" onClick={() => setF((c) => (c ? { ...c, bannerKind: 'preset', banner: b.id } : c))} aria-label={b.label} aria-pressed={f.bannerKind === 'preset' && f.banner === b.id} className={cn('relative h-14 overflow-hidden rounded-xl border', f.bannerKind === 'preset' && f.banner === b.id ? 'border-paper' : 'border-line')} style={bannerStyle('preset', b.id)}>
                        {f.bannerKind === 'preset' && f.banner === b.id && <Check className="absolute top-1.5 right-1.5 size-4" />}
                      </button>
                    ))}
                    <button type="button" onClick={() => bannerInput.current?.click()} className={cn('grid h-14 place-items-center rounded-xl border border-dashed text-xs text-mute hover:text-paper', f.bannerKind === 'image' ? 'border-paper text-paper' : 'border-line-strong')}>
                      {busy === 'banner' ? <Loader2 className="size-4 animate-spin" /> : <span className="inline-flex items-center gap-1"><ImagePlus className="size-4" /> Upload</span>}
                    </button>
                    <input ref={bannerInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => upload('banner', e.target.files?.[0])} />
                  </div>
                  <div className="mt-4">
                    <Swatches label="Or one flat colour" value={f.bannerKind === 'color' ? f.banner : '#000000'} options={ACCENT_SWATCHES} onChange={(v) => setF((c) => (c ? { ...c, bannerKind: 'color', banner: v } : c))} />
                  </div>
                </Group>
              </div>
            )}

            {/* ================= EFFECTS ================= */}
            {tab === 'effects' && (
              <div className="grid gap-8">
                <Group title="Card effect" hint="Moves over your whole card">
                  <div className="grid gap-5">
                    <button type="button" onClick={() => set('cardEffect', 'none')} aria-pressed={f.cardEffect === 'none'} className={cn('flex h-11 items-center gap-2 justify-self-start rounded-full border px-4 text-sm transition-colors', f.cardEffect === 'none' ? 'border-paper bg-paper/10' : 'border-line text-mute hover:text-paper')}>
                      <Ban className="size-4" /> No effect
                    </button>
                    {EFFECT_GROUPS.map((g) => (
                      <div key={g.title}>
                        <p className="mb-2 text-xs text-mute">{g.title}</p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {g.ids.map((id) => {
                            const o = CARD_EFFECTS.find((x) => x.id === id)
                            if (!o) return null
                            const Icon = EFFECT_ICONS[o.id] ?? Ban
                            const on = f.cardEffect === o.id
                            return (
                              <button key={o.id} type="button" onClick={() => set('cardEffect', o.id)} aria-pressed={on} className={cn('flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition-all hover:-translate-y-0.5', on ? 'border-paper bg-paper/10' : 'border-line text-mute hover:bg-paper/5 hover:text-paper')}>
                                <Icon className="size-5" />
                                {o.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </Group>
                <AnimatePresence initial={false}>
                  {f.cardEffect !== 'none' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="grid gap-4 rounded-2xl border border-line bg-ink/50 p-4">
                        <Slider label="Intensity" hint="How much there is" value={f.effectIntensity} onChange={(v) => set('effectIntensity', v)} />
                        <Slider label="Speed" hint="How fast it moves" value={f.effectSpeed} onChange={(v) => set('effectSpeed', v)} />
                        <button type="button" onClick={() => { set('effectIntensity', 50); set('effectSpeed', 50) }} className="w-fit text-xs text-mute underline underline-offset-4 hover:text-paper">Reset to normal</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Group title="Page background" hint="The dots behind your card">
                  <Swatches label="Dot colour" value={f.dotColor} options={DOT_SWATCHES} onChange={(v) => set('dotColor', v)} />
                </Group>
              </div>
            )}

            {/* ================= LINKS ================= */}
            {tab === 'links' && (
              <div className="grid gap-7">
                <Group title="On your profile" hint={`${f.links.length} of ${MAX_LINKS}`}>
                  {f.links.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-mute">Nothing yet. Pick a platform below and type your username.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      <AnimatePresence initial={false}>
                        {f.links.map((l) => (
                          <motion.li key={l.platform} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="group/l relative">
                            <button type="button" onClick={() => setEditing(l.platform)} aria-label={`Edit ${meta(l.platform)?.label}`} title={`${meta(l.platform)?.label}: ${usernameOf(l.platform, l.url)}`} className="grid size-14 place-items-center rounded-2xl border border-line-strong bg-white/[0.05] transition-all hover:-translate-y-0.5 hover:bg-white/[0.12]">
                              {l.platform === 'website' ? <Globe className="size-6" /> : <BrandIcon name={l.platform} className="size-6" />}
                            </button>
                            <button type="button" onClick={() => removeLink(l.platform)} aria-label={`Remove ${meta(l.platform)?.label}`} className="absolute -top-1.5 -right-1.5 hidden size-6 place-items-center rounded-full bg-signal text-ink group-hover/l:grid group-focus-within/l:grid">
                              <X className="size-3.5" />
                            </button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </Group>
                <Group title="Add a platform" hint="Just your username">
                  <label className="mb-4 flex h-11 items-center gap-2 rounded-full border border-line-strong bg-ink/60 px-4 focus-within:border-paper/60">
                    <Search className="size-4 text-mute" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search TikTok, Spotify, Twitch…" aria-label="Search platforms" className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-mute" />
                  </label>
                  {LINK_GROUPS.map((g) => {
                    const list = LINK_PLATFORMS.filter((p) => p.group === g && matches(p))
                    if (!list.length) return null
                    return (
                      <div key={g} className="mb-5 last:mb-0">
                        <p className="mb-2 text-[11px] text-mute">{g}</p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                          {list.map((p) => {
                            const have = f.links.some((l) => l.platform === p.id)
                            return (
                              <button key={p.id} type="button" onClick={() => setEditing(p.id)} disabled={!have && f.links.length >= MAX_LINKS} title={p.label} className={cn('group relative flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-[11px] leading-tight transition-all hover:-translate-y-0.5 hover:bg-paper/10 disabled:opacity-35', have ? 'border-paper/50 bg-paper/[0.07]' : 'border-line text-mute hover:text-paper')}>
                                {p.id === 'website' ? <Globe className="size-5" /> : <BrandIcon name={p.id} className="size-5" />}
                                <span className="max-w-full truncate">{p.label}</span>
                                {have && <Check className="absolute top-1 right-1 size-3 text-paper" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </Group>
                <p className="text-xs leading-snug text-mute">Each one shows on your profile as a small icon button. Visitors are told these are not official logoless links, and websites and invites open a warning page first.</p>
              </div>
            )}

            {/* ================= PRIVACY ================= */}
            {tab === 'privacy' && <Visibility show={f.show} onChange={(show) => set('show', show)} />}

            {/* ================= PREVIEW (small screens) ================= */}
            {tab === 'preview' && <PreviewPane f={f} previewLinks={previewLinks} />}
          </motion.div>
        </AnimatePresence>

        {/* ---------- save bar ---------- */}
        <div className="sticky bottom-4 z-20 mt-5 rounded-3xl border border-line-strong bg-surface/95 p-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-1.5">
            <ActionButton onClick={save} disabled={saving || !dirty} className="rounded-full">
              {saving && <Loader2 className="size-4 animate-spin" />} Save profile
            </ActionButton>
            {dirty && (
              <button type="button" onClick={discard} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-mute hover:text-paper">
                <Undo2 className="size-4" /> Discard
              </button>
            )}
            <span className="flex items-center gap-2 text-xs text-mute">
              <span className={cn('size-2 rounded-full', dirty ? 'bg-amber-300' : 'bg-emerald-400')} />
              {dirty ? 'Unsaved changes' : 'All saved'}
            </span>
            <a href={`/@${f.handle}`} className="ml-auto pr-2 text-sm text-mute hover:text-paper">View public page</a>
          </div>
          {(note || error) && (
            <p role={error ? 'alert' : 'status'} className={cn('mt-2.5 rounded-2xl px-3.5 py-2.5 text-sm leading-snug', error ? 'bg-signal/10 text-signal' : 'bg-paper/[0.06] text-paper/80')}>
              {error || note}
            </p>
          )}
        </div>
      </div>

      {/* ---------- live preview (wide screens) ---------- */}
      <div className="hidden min-w-0 xl:sticky xl:top-[104px] xl:block xl:self-start">
        <PreviewPane f={f} previewLinks={previewLinks} />
      </div>

      <LinkDialog
        platform={editing}
        current={f.links.find((l) => l.platform === editing)?.url ?? ''}
        onClose={() => setEditing(null)}
        onSave={(l) => {
          upsertLink(l)
          setEditing(null)
        }}
        onRemove={(p) => {
          removeLink(p)
          setEditing(null)
        }}
      />
    </div>
  )
}

type TabId = 'profile' | 'style' | 'effects' | 'links' | 'privacy' | 'preview'

const EFFECT_GROUPS: { title: string; ids: string[] }[] = [
  { title: 'Weather', ids: ['snow', 'rain', 'lightning', 'smoke'] },
  { title: 'Nature', ids: ['petals', 'leaves', 'fireflies', 'aurora', 'caustics', 'rays'] },
  { title: 'Sparkle and celebrate', ids: ['embers', 'sparkle', 'fireworks', 'confetti', 'stars', 'bubbles'] },
  { title: 'Screen', ids: ['code', 'film', 'vhs'] },
]

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-medium">{title}</h2>
        {hint && <p className="text-xs text-mute">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function PreviewPane({ f, previewLinks }: { f: ProfileView; previewLinks: { platform: string; href: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-3 flex items-center justify-between font-mono text-xs text-mute">
        <span>Live preview</span>
        <span>Example numbers</span>
      </p>
      <div className="relative overflow-hidden rounded-[28px] border border-line bg-black">
        <MiniDots color={f.dotColor} />
        <div className="relative flex justify-center px-4 py-8">
          <ProfileCard
            preview
            isOwner
            view={f}
            stats={{ ...(f.show.clips ? { clips: 12 } : {}), ...(f.show.views ? { views: 48200 } : {}), ...(f.show.earnings ? { earnedCents: 32000 } : {}), ...(f.show.campaigns ? { campaigns: 4 } : {}) }}
            links={previewLinks}
          />
        </div>
      </div>
    </div>
  )
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.18 } }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-[26px] border border-line-strong bg-surface p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl">{title}</h2>
              <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-paper/10">
                <X className="size-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function LinkDialog({ platform, current, onClose, onSave, onRemove }: { platform: string | null; current: string; onClose: () => void; onSave: (l: ProfileLink) => void; onRemove: (p: string) => void }) {
  const [url, setUrl] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => {
    setUrl(platform ? usernameOf(platform, current) : current)
    setErr('')
  }, [platform, current])
  const m = platform ? meta(platform) : null

  const submit = () => {
    if (!m) return
    const r = buildLink(m.id, url)
    if ('error' in r) return setErr(r.error)
    onSave({ platform: m.id as ProfileLink['platform'], url: r.url })
  }
  const spec = m ? USERNAME_LINKS[m.id] : undefined
  const built = m && url.trim() ? buildLink(m.id, url) : null

  return (
    <Modal open={Boolean(m)} onClose={onClose} title={m ? `${current ? 'Edit' : 'Add'} ${m.label}` : ''}>
      {m && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="grid gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-white/[0.07]">{m.id === 'website' ? <Globe className="size-6" /> : <BrandIcon name={m.id} className="size-6" />}</span>
            <p className="text-sm text-mute">{m.id === 'website' ? 'Visitors see a warning page before your site opens.' : spec ? `Just type your ${m.label} username. We build the link for you.` : `Paste the link to your ${m.label}.`}</p>
          </div>
          <Field label={spec ? 'Username' : 'Link'}>
            <div className="flex items-stretch">
              {spec && <span className="grid shrink-0 place-items-center rounded-l-[inherit] border border-r-0 border-line-strong bg-white/[0.04] px-3 font-mono text-xs text-mute select-none">{spec.label}</span>}
              <Input
                autoFocus
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setErr('')
                }}
                placeholder={spec ? 'yourname' : m.placeholder}
                inputMode={spec ? 'text' : 'url'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={Boolean(err)}
                className="min-w-0 flex-1"
              />
            </div>
          </Field>
          {built && 'url' in built && !err && <p className="-mt-2 truncate text-xs text-mute">Opens <span className="text-paper/80">{built.url.replace(/^https:\/\//, '')}</span></p>}
          {spec && !err && !built && <p className="-mt-2 text-xs text-mute">Already have the full link? Paste it instead, that works too.</p>}
          {err && <p role="alert" className="text-sm text-signal">{err}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton type="submit" className="rounded-full">{current ? 'Save link' : 'Add link'}</ActionButton>
            {current && (
              <button type="button" onClick={() => onRemove(m.id)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-signal/50 px-4 text-sm text-signal hover:bg-signal/10">
                <Trash2 className="size-3.5" /> Remove
              </button>
            )}
            <button type="button" onClick={onClose} className="text-sm text-mute hover:text-paper">Cancel</button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function Swatches({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="font-mono text-xs text-mute">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {options.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} aria-label={c} aria-pressed={value.toLowerCase() === c} className={cn('size-8 rounded-full border-2 transition-transform hover:scale-110', value.toLowerCase() === c ? 'border-paper' : 'border-transparent')} style={{ background: c }} />
        ))}
        <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-line-strong text-[10px] text-mute">
          +
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Custom ${label}`} />
        </label>
      </div>
    </div>
  )
}

const EFFECT_ICONS: Record<string, LucideIcon> = { none: Ban, snow: Snowflake, rain: CloudRain, embers: Flame, sparkle: Sparkles, stars: Star, aurora: Waves, fireflies: Bug, petals: Flower2, bubbles: CircleDot, lightning: Zap, smoke: Wind, leaves: Leaf, confetti: PartyPopper, fireworks: Rocket, rays: Sun, caustics: Droplets, code: Binary, film: Film, vhs: Tv }

function Slider({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-sm">{label} <span className="text-xs text-mute">{hint}</span></span>
        <span className="font-mono text-xs text-mute tabular-nums">{value}</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-line-strong accent-white [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-paper [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgb(255_255_255/0.12)]"
      />
    </label>
  )
}

const SHOW_GROUPS: { title: string; keys: string[] }[] = [
  { title: 'On your card', keys: ['badges', 'joined', 'country', 'status', 'links'] },
  { title: 'Your numbers', keys: ['clips', 'views', 'earnings', 'campaigns'] },
]

/** One tap per thing. Public things are bright with an open eye, hidden things are dim with a crossed eye. */
function Visibility({ show, onChange }: { show: ShowMap; onChange: (s: ShowMap) => void }) {
  const total = SHOW_OPTIONS.length
  const shown = SHOW_OPTIONS.filter((o) => show[o.key]).length
  const setAll = (fn: (k: keyof ShowMap, def: boolean) => boolean) => onChange(Object.fromEntries(SHOW_OPTIONS.map((o) => [o.key, fn(o.key, o.on)])) as ShowMap)
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-xs text-mute">{shown} of {total} public</span>
        <button type="button" onClick={() => setAll(() => true)} className="h-8 rounded-full border border-line-strong px-3.5 text-xs hover:bg-paper/10">Show all</button>
        <button type="button" onClick={() => setAll((_k, def) => def)} className="h-8 rounded-full border border-line-strong px-3.5 text-xs hover:bg-paper/10">Recommended</button>
        <button type="button" onClick={() => setAll(() => false)} className="h-8 rounded-full border border-line-strong px-3.5 text-xs hover:bg-paper/10">Hide all</button>
      </div>
      <div className="mt-4 grid gap-5">
        {SHOW_GROUPS.map((g) => (
          <div key={g.title}>
            <p className="mb-2 text-xs text-mute">{g.title}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {g.keys.map((k) => {
                const o = SHOW_OPTIONS.find((x) => x.key === k)
                if (!o) return null
                const on = show[o.key]
                return (
                  <button
                    key={o.key}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => onChange({ ...show, [o.key]: !on } as ShowMap)}
                    className={cn('group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-[0.98]', on ? 'border-paper/60 bg-paper/[0.09]' : 'border-line bg-transparent opacity-60 hover:opacity-100')}
                  >
                    <span className={cn('grid size-9 shrink-0 place-items-center rounded-full transition-colors', on ? 'bg-paper text-ink' : 'bg-line text-mute')}>
                      {on ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm leading-tight">{o.label}</span>
                      <span className="block truncate text-xs text-mute">{on ? 'Public' : 'Hidden'} · {o.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-mute">Your username, name, picture and banner are always public. The preview updates as you tap.</p>
    </div>
  )
}
