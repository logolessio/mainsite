'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Ban, Bug, Camera, Check, CircleDot, CloudRain, Download, Eye, EyeOff, Flame, Flower2, Globe, ImagePlus, Loader2, Pencil, Plus, Snowflake, Sparkles, Star, Trash2, Waves, X, type LucideIcon } from 'lucide-react'
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
  const [picker, setPicker] = useState(false)
  const [editing, setEditing] = useState<string | null>(null) // platform being edited
  const [discordId, setDiscordId] = useState('')
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

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,560px)_1fr]">
      <ProfileTheme dot={f.dotColor} />
      <div className="grid content-start gap-6">
        {/* ---------- import ---------- */}
        <Card title="Import from Discord">
          <p className="text-sm text-mute">Bring your Discord picture, banner, colour and name across in one go.</p>
          {!loaded.discordImport && <p className="mt-3 rounded-xl border border-line bg-ink/60 p-3 text-xs text-mute">This is not switched on yet. The site owner needs to add a Discord bot token first (see PLATFORM_SETUP.md).</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Input value={discordId} onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, '').slice(0, 22))} placeholder="Your Discord user ID" inputMode="numeric" className="max-w-xs flex-1" aria-label="Discord user ID" />
            <ActionButton onClick={importDiscord} disabled={!loaded.discordImport || busy === 'discord' || discordId.length < 15} className="rounded-full">
              {busy === 'discord' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Import
            </ActionButton>
          </div>
          <details className="mt-3 text-xs text-mute">
            <summary className="cursor-pointer hover:text-paper">Where do I find my ID?</summary>
            <p className="mt-2 leading-snug">In Discord open User Settings, then Advanced, and turn on Developer Mode. Then right-click your name anywhere and choose Copy User ID. Discord does not let apps read your “About me” text or your connections, so those you add by hand below.</p>
          </details>
        </Card>

        {/* ---------- identity ---------- */}
        <Card title="Identity">
          <div className="grid gap-4">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => avatarInput.current?.click()} className="group relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-raised" aria-label="Change profile picture">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {f.avatar ? <img src={f.avatar} alt="" className="size-full object-cover" referrerPolicy="no-referrer" /> : <Camera className="size-5 text-mute" />}
                <span className="absolute inset-0 grid place-items-center bg-ink/60 opacity-0 transition-opacity group-hover:opacity-100">{busy === 'avatar' ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}</span>
              </button>
              <input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => upload('avatar', e.target.files?.[0])} />
              <div className="text-sm text-mute">
                <p>Profile picture</p>
                <button type="button" onClick={() => { setPendingAvatar(null); set('avatar', null) }} className="mt-1 inline-flex items-center gap-1 text-xs hover:text-paper">
                  <Trash2 className="size-3" /> Use my sign-in picture
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name"><Input value={f.displayName} maxLength={40} onChange={(e) => set('displayName', e.target.value)} /></Field>
              <Field label="Username" hint={`logoless.io/@${f.handle}`}><Input value={f.handle} maxLength={20} onChange={(e) => set('handle', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} /></Field>
              <Field label="Pronouns (optional)"><Input value={f.pronouns} maxLength={30} placeholder="e.g. she/her" onChange={(e) => set('pronouns', e.target.value)} /></Field>
              <Field label="Country (optional)">
                <Select value={f.country ?? ''} onChange={(e) => set('country', e.target.value || null)}>
                  <option value="">Prefer not to say</option>
                  {['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'SG', 'NL', 'SE', 'BR', 'IN', 'NG', 'ZA', 'PH', 'ID', 'MX', 'JP', 'KR'].map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="About me" hint={`${f.bio.length}/400`}><Textarea value={f.bio} maxLength={400} rows={4} onChange={(e) => set('bio', e.target.value)} /></Field>
          </div>
        </Card>

        {/* ---------- connections ---------- */}
        <Card title="Connections">
          <div className="flex flex-wrap gap-2">
            <AnimatePresence initial={false}>
              {f.links.map((l) => (
                <motion.div key={l.platform} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="group inline-flex h-10 items-center rounded-lg bg-white/[0.07]">
                  <button type="button" onClick={() => setEditing(l.platform)} className="inline-flex h-full items-center gap-2 pr-2 pl-3 text-sm hover:text-paper" aria-label={`Edit ${meta(l.platform)?.label}`}>
                    {l.platform === 'website' ? <Globe className="size-4" /> : <BrandIcon name={l.platform} className="size-4" />}
                    {meta(l.platform)?.label}
                    <Pencil className="size-3 text-mute opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                  <button type="button" onClick={() => removeLink(l.platform)} aria-label={`Remove ${meta(l.platform)?.label}`} className="grid h-full w-8 place-items-center rounded-r-lg text-mute hover:bg-signal/20 hover:text-signal">
                    <X className="size-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {f.links.length < MAX_LINKS && (
              <button type="button" onClick={() => setPicker(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-4 text-sm text-mute transition-colors hover:border-paper hover:text-paper">
                <Plus className="size-4" /> Add
              </button>
            )}
          </div>
          <p className="mt-3 text-xs leading-snug text-mute">
            Press Add, pick an icon, then paste your link. On your profile each one is a button. Visitors see a note that these are not official logoless links, and websites and invites open a warning page first.
          </p>
        </Card>

        {/* ---------- look ---------- */}
        <Card title="Name style">
          <div className="grid gap-5">
            <div>
              <p className="font-mono text-xs text-mute">Font</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FONT_OPTIONS.map((o) => (
                  <button key={o.id} type="button" onClick={() => set('font', o.id)} aria-pressed={f.font === o.id} className={cn('rounded-xl border px-3 py-2.5 text-left transition-colors', f.font === o.id ? 'border-paper bg-paper/10' : 'border-line hover:bg-paper/5')}>
                    <span className={cn('block truncate text-lg leading-tight', PROFILE_FONT_CLASS[o.id])}>{o.label}</span>
                    <span className="block text-[11px] text-mute">{o.note}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-xs text-mute">Effect</p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {NAME_EFFECTS.map((o) => (
                  <button key={o.id} type="button" onClick={() => set('nameEffect', o.id)} aria-pressed={f.nameEffect === o.id} className={cn('rounded-xl border px-2 py-2.5 text-center', f.nameEffect === o.id ? 'border-paper bg-paper/10' : 'border-line hover:bg-paper/5')}>
                    <span style={nameVars} className={cn('block text-base font-bold', `nx-${o.id}`, o.id === 'gradient' && 'w-fit mx-auto')}>Aa</span>
                    <span className="block text-[11px] text-mute">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Swatches label="Primary colour" value={f.accent} options={ACCENT_SWATCHES} onChange={(v) => set('accent', v)} />
            <Swatches label="Accent colour" value={f.accent2} options={ACCENT_SWATCHES} onChange={(v) => set('accent2', v)} />
          </div>
        </Card>

        <Card title="Banner">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
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
            <Swatches label="Or a single colour" value={f.bannerKind === 'color' ? f.banner : '#000000'} options={ACCENT_SWATCHES} onChange={(v) => setF((c) => (c ? { ...c, bannerKind: 'color', banner: v } : c))} />
          </div>
        </Card>

        <Card title="Background and effects">
          <div className="grid gap-6">
            <div>
              <Swatches label="Background effect colour" value={f.dotColor} options={DOT_SWATCHES} onChange={(v) => set('dotColor', v)} />
              <p className="mt-2 text-xs text-mute">The glowing dots behind your card. The preview on the right shows them in this colour.</p>
            </div>
            <div>
              <p className="font-mono text-xs text-mute">Card effect</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {CARD_EFFECTS.map((o) => {
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
            {f.cardEffect !== 'none' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid gap-4 overflow-hidden rounded-2xl border border-line bg-ink/50 p-4">
                <Slider label="Intensity" hint="How much there is" value={f.effectIntensity} onChange={(v) => set('effectIntensity', v)} />
                <Slider label="Speed" hint="How fast it moves" value={f.effectSpeed} onChange={(v) => set('effectSpeed', v)} />
                <button type="button" onClick={() => { set('effectIntensity', 50); set('effectSpeed', 50) }} className="w-fit text-xs text-mute underline underline-offset-4 hover:text-paper">Reset to normal</button>
              </motion.div>
            )}
          </div>
        </Card>

        <Card title="What strangers can see">
          <Visibility show={f.show} onChange={(show) => set('show', show)} />
        </Card>

        <div className="sticky bottom-4 z-10 rounded-3xl border border-line-strong bg-surface/95 p-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-1.5">
            <ActionButton onClick={save} disabled={saving} className="rounded-full">
              {saving && <Loader2 className="size-4 animate-spin" />} Save profile
            </ActionButton>
            <a href={`/@${f.handle}`} className="text-sm text-mute hover:text-paper">View public page</a>
          </div>
          {(note || error) && (
            <p role={error ? 'alert' : 'status'} className={cn('mt-2.5 rounded-2xl px-3.5 py-2.5 text-sm leading-snug', error ? 'bg-signal/10 text-signal' : 'bg-paper/[0.06] text-paper/80')}>
              {error || note}
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
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

      <Modal open={picker} onClose={() => setPicker(false)} title="Add a connection">
        <div className="grid gap-5">
          {LINK_GROUPS.map((g) => (
            <div key={g}>
              <p className="mb-2 font-mono text-[11px] tracking-widest text-mute uppercase">{g}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {LINK_PLATFORMS.filter((p) => p.group === g).map((p) => {
                  const have = f.links.some((l) => l.platform === p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPicker(false)
                        setEditing(p.id)
                      }}
                      className={cn('group flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-xs transition-all hover:-translate-y-0.5 hover:bg-paper/10', have ? 'border-paper/50 bg-paper/5' : 'border-line')}
                    >
                      {p.id === 'website' ? <Globe className="size-6" /> : <BrandIcon name={p.id} className="size-6" />}
                      <span className="text-center leading-tight">{p.label}</span>
                      {have && <span className="text-[10px] text-mute">added</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>

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

const EFFECT_ICONS: Record<string, LucideIcon> = { none: Ban, snow: Snowflake, rain: CloudRain, embers: Flame, sparkle: Sparkles, stars: Star, aurora: Waves, fireflies: Bug, petals: Flower2, bubbles: CircleDot }

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
