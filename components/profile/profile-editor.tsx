'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, Download, Globe, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
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
  LINK_PLATFORMS,
  MAX_LINKS,
  NAME_EFFECTS,
  SHOW_OPTIONS,
  type ProfileLink,
  type ProfileView,
  type ShowMap,
} from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import { bannerStyle, ProfileCard } from './profile-card'
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

        <Card title="Banner and background">
          <div className="grid gap-5">
            <div>
              <p className="font-mono text-xs text-mute">Banner</p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
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
              <div className="mt-3">
                <Swatches label="Or a single colour" value={f.bannerKind === 'color' ? f.banner : '#000000'} options={ACCENT_SWATCHES} onChange={(v) => setF((c) => (c ? { ...c, bannerKind: 'color', banner: v } : c))} />
              </div>
            </div>
            <Swatches label="Background dot colour" value={f.dotColor} options={DOT_SWATCHES} onChange={(v) => set('dotColor', v)} />
            <div>
              <p className="font-mono text-xs text-mute">Card effect</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CARD_EFFECTS.map((o) => (
                  <button key={o.id} type="button" onClick={() => set('cardEffect', o.id)} aria-pressed={f.cardEffect === o.id} className={cn('h-9 rounded-full border px-4 text-sm', f.cardEffect === o.id ? 'border-paper bg-paper/10' : 'border-line text-mute hover:text-paper')}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="What strangers can see">
          <ul className="divide-y divide-line">
            {SHOW_OPTIONS.map((o) => (
              <li key={o.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm">{o.label}</p>
                  <p className="text-xs text-mute">{o.hint}</p>
                </div>
                <Toggle label={o.label} checked={f.show[o.key]} onChange={(v) => set('show', { ...f.show, [o.key]: v } as ShowMap)} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-mute">Your username, name, picture and banner are always public. Everything above is your choice.</p>
        </Card>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-full border border-line-strong bg-surface/95 p-2 pl-4 backdrop-blur">
          <ActionButton onClick={save} disabled={saving} className="rounded-full">
            {saving && <Loader2 className="size-4 animate-spin" />} Save profile
          </ActionButton>
          <a href={`/@${f.handle}`} className="text-sm text-mute hover:text-paper">View public page</a>
          {note && <span role="status" className="max-w-md text-sm text-mute">{note}</span>}
          {error && <span role="alert" className="text-sm text-signal">{error}</span>}
        </div>
      </div>

      <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
        <p className="mb-3 font-mono text-xs text-mute">Live preview</p>
        <div className="flex justify-center overflow-hidden rounded-[28px] border border-line bg-ink/60 p-6">
          <ProfileCard
            preview
            isOwner
            view={f}
            stats={{ ...(f.show.clips ? { clips: 0 } : {}), ...(f.show.views ? { views: 0 } : {}), ...(f.show.earnings ? { earnedCents: 0 } : {}), ...(f.show.campaigns ? { campaigns: 0 } : {}) }}
            links={previewLinks}
          />
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
    setUrl(current)
    setErr('')
  }, [platform, current])
  const m = platform ? meta(platform) : null

  const submit = () => {
    if (!m) return
    let u: URL
    try {
      u = new URL(url.trim())
    } catch {
      return setErr('Paste the full link, starting with https://')
    }
    if (u.protocol !== 'https:') return setErr('The link must start with https://')
    if (m.hosts.length && !m.hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))) return setErr(`That does not look like a ${m.label} link.`)
    onSave({ platform: m.id as ProfileLink['platform'], url: u.toString() })
  }

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
            <p className="text-sm text-mute">{m.id === 'website' ? 'Visitors see a warning page before your site opens.' : `Paste the link to your ${m.label}.`}</p>
          </div>
          <Field label="Link">
            <Input autoFocus value={url} onChange={(e) => { setUrl(e.target.value); setErr('') }} placeholder={m.placeholder} inputMode="url" aria-invalid={Boolean(err)} />
          </Field>
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
