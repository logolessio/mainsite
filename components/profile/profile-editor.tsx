'use client'

import { Camera, Check, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActionButton, Card, Toggle } from '@/components/app/ui'
import { Field, Input, Select, Textarea } from '@/components/ui/fields'
import { NAV_USER_REFRESH } from '@/components/shell/nav-user'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { PROFILE_FONT_CLASS } from '@/lib/profile-fonts'
import {
  ACCENT_SWATCHES,
  BANNER_PRESETS,
  DOT_SWATCHES,
  FONT_OPTIONS,
  LINK_PLATFORMS,
  SHOW_OPTIONS,
  type ProfileView,
  type ShowMap,
} from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import { uploadImage } from '@/lib/image-client'
import { bannerStyle, ProfileScreen } from './profile-screen'
import { ProfileTheme } from './profile-theme'

type Loaded = { profile: ProfileView; unlocked: string[] }

async function api<T>(path: string, method: string, data?: unknown): Promise<T> {
  const res = await fetch(path, { method, headers: data ? { 'content-type': 'application/json' } : undefined, body: data ? JSON.stringify(data) : undefined })
  const j = (await res.json().catch(() => null)) as ({ error?: string } & T) | null
  if (!res.ok) throw new Error(j?.error ?? 'Something went wrong. Please try again.')
  return j as T
}

export function ProfileEditor() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [f, setF] = useState<ProfileView | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'avatar' | 'banner' | null>(null)
  const [pendingAvatar, setPendingAvatar] = useState<string | null | undefined>(undefined)
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
        set('bannerKind', 'image')
        set('banner', `/api/img/${id}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
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
      const bannerId = f.bannerKind === 'image' ? f.banner.replace('/api/img/', '') : f.banner
      const res = await api<{ profile: ProfileView; newBadges: string[] }>('/api/me/profile', 'PUT', {
        handle: f.handle,
        displayName: f.displayName,
        bio: f.bio,
        country: f.country,
        bannerKind: f.bannerKind,
        banner: bannerId,
        dotColor: f.dotColor,
        accent: f.accent,
        font: f.font,
        links: f.links,
        website: f.website ?? '',
        show: f.show,
        ...(pendingAvatar !== undefined ? { avatar: pendingAvatar } : {}),
      })
      setF(res.profile)
      setPendingAvatar(undefined)
      window.dispatchEvent(new Event(NAV_USER_REFRESH))
      const names = res.newBadges.map((id) => BADGE_BY_ID[id]?.name).filter(Boolean)
      setNote(names.length ? `Saved. New badge${names.length > 1 ? 's' : ''}: ${names.join(', ')}` : 'Saved')
      setTimeout(() => setNote(''), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const linkMap = useMemo(() => Object.fromEntries((f?.links ?? []).map((l) => [l.platform, l.url])), [f?.links])
  const setLink = (platform: string, url: string) =>
    setF((cur) => {
      if (!cur) return cur
      const rest = cur.links.filter((l) => l.platform !== platform)
      return { ...cur, links: url ? [...rest, { platform: platform as never, url }] : rest }
    })

  if (!f || !loaded) return <p className="text-mute">{error || 'Loading your profile…'}</p>

  const previewLinks = f.links.map((l) => ({ platform: l.platform, href: l.url, label: LINK_PLATFORMS.find((p) => p.id === l.platform)?.label ?? l.platform }))
  let website: { href: string; host: string } | null = null
  try {
    if (f.website) website = { href: f.website, host: new URL(f.website).hostname.replace(/^www\./, '') }
  } catch {
    /* incomplete address while typing */
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,520px)_1fr]">
      <ProfileTheme dot={f.dotColor} />
      <div className="grid content-start gap-6">
        <Card title="You">
          <div className="grid gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => avatarInput.current?.click()}
                className="group relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-raised"
                aria-label="Change profile picture"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {f.avatar ? <img src={f.avatar} alt="" className="size-full object-cover" referrerPolicy="no-referrer" /> : <Camera className="size-5 text-mute" />}
                <span className="absolute inset-0 grid place-items-center bg-ink/60 opacity-0 transition-opacity group-hover:opacity-100">
                  {busy === 'avatar' ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
                </span>
              </button>
              <input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => upload('avatar', e.target.files?.[0])} />
              <div className="text-sm text-mute">
                <p>Profile picture</p>
                <button
                  type="button"
                  onClick={() => {
                    setPendingAvatar(null)
                    set('avatar', null)
                  }}
                  className="mt-1 inline-flex items-center gap-1 text-xs hover:text-paper"
                >
                  <Trash2 className="size-3" /> Use my sign-in picture
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <Input value={f.displayName} maxLength={40} onChange={(e) => set('displayName', e.target.value)} />
              </Field>
              <Field label="Username" hint={`logoless.io/@${f.handle}`}>
                <Input value={f.handle} maxLength={20} onChange={(e) => set('handle', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
              </Field>
            </div>
            <Field label="Bio" hint={`${f.bio.length}/280`}>
              <Textarea value={f.bio} maxLength={280} rows={3} onChange={(e) => set('bio', e.target.value)} />
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
        </Card>

        <Card title="Look">
          <div className="grid gap-6">
            <div>
              <p className="font-mono text-xs text-mute">Banner</p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {BANNER_PRESETS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      set('bannerKind', 'preset')
                      set('banner', b.id)
                    }}
                    aria-label={b.label}
                    aria-pressed={f.bannerKind === 'preset' && f.banner === b.id}
                    className={cn('relative h-14 overflow-hidden rounded-2xl border', f.bannerKind === 'preset' && f.banner === b.id ? 'border-paper' : 'border-line')}
                    style={bannerStyle('preset', b.id)}
                  >
                    {f.bannerKind === 'preset' && f.banner === b.id && <Check className="absolute top-1.5 right-1.5 size-4" />}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => bannerInput.current?.click()}
                  className={cn('grid h-14 place-items-center rounded-2xl border border-dashed text-xs text-mute hover:text-paper', f.bannerKind === 'image' ? 'border-paper text-paper' : 'border-line-strong')}
                >
                  {busy === 'banner' ? <Loader2 className="size-4 animate-spin" /> : <span className="inline-flex items-center gap-1"><ImagePlus className="size-4" /> Upload</span>}
                </button>
                <input ref={bannerInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => upload('banner', e.target.files?.[0])} />
              </div>
            </div>

            <Swatches label="Background dot colour" value={f.dotColor} options={DOT_SWATCHES} onChange={(v) => set('dotColor', v)} />
            <Swatches label="Accent colour" value={f.accent} options={ACCENT_SWATCHES} onChange={(v) => set('accent', v)} />

            <div>
              <p className="font-mono text-xs text-mute">Font</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FONT_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => set('font', o.id)}
                    aria-pressed={f.font === o.id}
                    className={cn('rounded-2xl border px-3 py-2.5 text-left', PROFILE_FONT_CLASS[o.id], f.font === o.id ? 'border-paper bg-paper/10' : 'border-line hover:bg-paper/5')}
                  >
                    <span className="block text-xl leading-tight">{o.label}</span>
                    <span className="block font-sans text-[11px] text-mute">{o.note}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Links">
          <div className="grid gap-3">
            {LINK_PLATFORMS.map((p) => (
              <Field key={p.id} label={p.label}>
                <Input value={linkMap[p.id] ?? ''} placeholder={p.placeholder} inputMode="url" onChange={(e) => setLink(p.id, e.target.value.trim())} />
              </Field>
            ))}
            <Field label="Website" hint="Visitors see a short notice and press “I understand” before it opens.">
              <Input value={f.website ?? ''} placeholder="https://your-site.com" inputMode="url" onChange={(e) => set('website', e.target.value.trim() || null)} />
            </Field>
            <p className="rounded-2xl border border-line bg-ink/60 p-3 text-xs leading-relaxed text-mute">
              Your links show a note that they are added by you and are not official logoless links. Only https links to each platform’s own site are accepted. Never link to anything misleading: it breaks our{' '}
              <a href="/legal/external-links" className="underline">external links rules</a>.
            </p>
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

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-full border border-line-strong bg-surface/95 p-2 pl-4">
          <ActionButton onClick={save} disabled={saving} className="rounded-full">
            {saving && <Loader2 className="size-4 animate-spin" />} Save profile
          </ActionButton>
          <a href={`/@${f.handle}`} className="text-sm text-mute hover:text-paper">View public page</a>
          {note && <span role="status" className="text-sm text-mute">{note}</span>}
          {error && <span role="alert" className="text-sm text-signal">{error}</span>}
        </div>
      </div>

      <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
        <p className="mb-3 font-mono text-xs text-mute">Live preview</p>
        <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-[32px] border border-line bg-ink/60 p-3 no-scrollbar">
          <ProfileScreen
            preview
            view={{ ...f, badges: f.badges }}
            stats={{
              ...(f.show.clips ? { clips: 0 } : {}),
              ...(f.show.views ? { views: 0 } : {}),
              ...(f.show.earnings ? { earnedCents: 0 } : {}),
              ...(f.show.campaigns ? { campaigns: 0 } : {}),
            }}
            links={previewLinks}
            website={website}
            isOwner
          />
        </div>
      </div>
    </div>
  )
}

function Swatches({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="font-mono text-xs text-mute">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {options.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            aria-pressed={value.toLowerCase() === c}
            className={cn('size-8 rounded-full border-2 transition-transform hover:scale-110', value.toLowerCase() === c ? 'border-paper' : 'border-transparent')}
            style={{ background: c }}
          />
        ))}
        <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-line-strong text-[10px] text-mute">
          +
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Custom ${label}`} />
        </label>
      </div>
    </div>
  )
}
