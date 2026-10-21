'use client'

import { Ban, Binary, Bug, CircleDot, CloudRain, Droplets, Film, Flame, Flower2, ImagePlus, Leaf, Loader2, PartyPopper, Rocket, Snowflake, Sparkles, Star, Sun, Trash2, Tv, Upload, Video, Waves, Wind, Zap, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BadgeBoard } from '@/components/badges/badge-board'
import { uploadBackground, uploadBanner, uploadBgVideo, uploadImage } from '@/lib/image-client'
import { avatarSrc, lookKey } from '@/lib/looks'
import {
  BANNER_ASPECT_MAX,
  BANNER_ASPECT_MIN,
  BG_EFFECTS,
  OVERLAY_EFFECTS,
  type BgKind,
  type ProfileExtras,
} from '@/lib/profile-extras'
import { ACCENT_SWATCHES, BANNER_PRESETS, CARD_EFFECTS, DOT_SWATCHES, type ProfileView } from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import { GifPicker } from './gif-picker'
import { LookPicker } from './look-picker'
import { bannerStyle } from './profile-card'
import { Group, Segmented, Slider, Swatches, Tile } from './studio-controls'

export type Studio = {
  f: ProfileView
  setF: React.Dispatch<React.SetStateAction<ProfileView | null>>
  /** Changes part of the studio choices. */
  ex: <K extends keyof ProfileExtras>(k: K, patch: Partial<ProfileExtras[K]>) => void
  setPendingAvatar: (v: string | null | undefined) => void
  onError: (msg: string) => void
}

const err = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

function UploadButton({ label, accept, busy, onFile, icon: Icon = Upload }: { label: string; accept: string; busy: boolean; onFile: (f: File) => void; icon?: LucideIcon }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-pill bg-paper px-4 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />} {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onFile(file)
        }}
      />
    </>
  )
}

/** Recent uploads of one kind, newest first. */
function useRecent(kind: 'banner' | 'background' | 'bgvideo', bump: number) {
  const [list, setList] = useState<{ id: string; aspect: number | null }[]>([])
  useEffect(() => {
    fetch(`/api/me/uploads?kind=${kind}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { uploads?: { id: string; aspect: number | null }[] } | null) => j?.uploads && setList(j.uploads))
      .catch(() => {})
  }, [kind, bump])
  return list
}

const EMOJI = ['✨', '🔥', '💜', '🖤', '🌙', '⭐', '🎬', '🎧', '🎮', '📸', '🎨', '🚀', '👑', '💎', '🌸', '🍀', '🦋', '🐉', '👻', '😎', '🤖', '👾', '🎵', '⚡', '🌊', '🌈', '🍕', '☕', '🐱', '🐶', '🦊', '🐼']

// ================================================================= picture
export function AvatarPanel({ s }: { s: Studio }) {
  const { f, ex } = s
  const a = f.extras.avatar
  const [busy, setBusy] = useState(false)
  const [custom, setCustom] = useState('')
  const lookId = f.avatar?.startsWith('/api/look/') ? (/\/api\/look\/([a-z]+)/.exec(f.avatar)?.[1] ?? '') : ''
  const upload = async (file: File) => {
    setBusy(true)
    try {
      const id = await uploadImage('avatar', file)
      s.setPendingAvatar(id)
      s.setF((c) => (c ? { ...c, avatar: `/api/img/${id}`, extras: { ...c.extras, avatar: { ...c.extras.avatar, kind: 'image' } } } : c))
    } catch (e) {
      s.onError(err(e, 'Upload failed.'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="grid gap-6">
      <Segmented
        label="Kind of picture"
        layoutId="seg-avatar"
        value={a.kind}
        onChange={(kind) => ex('avatar', { kind })}
        options={[
          { id: 'image', label: 'Picture' },
          { id: 'gif', label: 'GIF' },
          { id: 'color', label: 'Solid colour' },
        ]}
      />
      {a.kind === 'image' && (
        <>
          <Group title="Your own picture" hint="Square works best">
            <div className="flex flex-wrap gap-2">
              <UploadButton label="Upload a picture" accept="image/png,image/jpeg,image/webp" busy={busy} onFile={upload} icon={ImagePlus} />
              <button
                type="button"
                onClick={() => {
                  s.setPendingAvatar(null)
                  s.setF((c) => (c ? { ...c, avatar: avatarSrc(null, c.displayName, c.handle) } : c))
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-line-strong px-4 text-sm text-mute hover:text-paper"
              >
                <Trash2 className="size-4" /> Remove
              </button>
            </div>
          </Group>
          <Group title="Ready-made" hint="A picture and banner that go together">
            <LookPicker
              value={lookId}
              onPick={(id) => {
                s.setPendingAvatar(lookKey(id))
                s.setF((c) => (c ? { ...c, avatar: avatarSrc(lookKey(id), c.displayName, c.handle), bannerKind: 'preset', banner: id, extras: { ...c.extras, banner: { ...c.extras.banner, gif: '' } } } : c))
              }}
            />
          </Group>
        </>
      )}
      {a.kind === 'gif' && <GifPicker selected={a.gif} onPick={(g) => ex('avatar', { gif: g.id, kind: 'gif' })} />}
      {a.kind === 'color' && (
        <>
          <Swatches label="Colour" value={a.color} options={ACCENT_SWATCHES} onChange={(color) => ex('avatar', { color })} />
          <Group title="On the colour">
            <Segmented
              label="What shows on the colour"
              layoutId="seg-glyph"
              value={a.glyph}
              onChange={(glyph) => ex('avatar', { glyph })}
              options={[
                { id: 'initials', label: 'My initials' },
                { id: 'emoji', label: 'An emoji' },
                { id: 'none', label: 'Nothing' },
              ]}
            />
          </Group>
          {a.glyph === 'emoji' && (
            <Group title="Emoji" hint="Or type any emoji">
              <div className="grid grid-cols-8 gap-1.5">
                {EMOJI.map((e) => (
                  <button key={e} type="button" onClick={() => ex('avatar', { emoji: e })} aria-pressed={a.emoji === e} aria-label={e} className={cn('grid aspect-square place-items-center rounded-tile text-xl transition-transform hover:scale-110', a.emoji === e ? 'bg-paper/15 ring-1 ring-paper' : 'hover:bg-white/5')}>
                    {e}
                  </button>
                ))}
              </div>
              <input
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value)
                  const v = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(e.target.value.trim())].pop()?.segment
                  if (v && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(v)) ex('avatar', { emoji: v })
                }}
                placeholder="Type or paste an emoji"
                aria-label="Your own emoji"
                className="mt-2 h-10 w-full rounded-pill border border-line-strong bg-ink px-4 text-sm outline-none focus:border-paper/60"
              />
            </Group>
          )}
          <Slider label="Grain" hint="Texture on the colour" value={a.noise} onChange={(noise) => ex('avatar', { noise })} normal={0} />
        </>
      )}
    </div>
  )
}

// ================================================================= banner
export function BannerPanel({ s }: { s: Studio }) {
  const { f, ex } = s
  const b = f.extras.banner
  const [busy, setBusy] = useState(false)
  const [bump, setBump] = useState(0)
  const recent = useRecent('banner', bump)
  const [mode, setMode] = useState<'look' | 'gif'>(b.gif ? 'gif' : 'look')
  const setBanner = (kind: ProfileView['bannerKind'], value: string, aspect = BANNER_ASPECT_MIN) =>
    s.setF((c) => (c ? { ...c, bannerKind: kind, banner: value, extras: { ...c.extras, banner: { ...c.extras.banner, gif: '', aspect } } } : c))
  const upload = async (file: File) => {
    setBusy(true)
    try {
      const r = await uploadBanner(file)
      setBanner('image', `/api/img/${r.id}`, r.aspect)
      setBump((x) => x + 1)
    } catch (e) {
      s.onError(err(e, 'Upload failed.'))
    } finally {
      setBusy(false)
    }
  }
  const current = !b.gif && f.bannerKind === 'image' ? f.banner.replace('/api/img/', '') : ''
  return (
    <div className="grid gap-6">
      <Segmented
        label="Kind of banner"
        layoutId="seg-banner"
        value={mode}
        onChange={setMode}
        options={[
          { id: 'look', label: 'Picture or colour' },
          { id: 'gif', label: 'GIF' },
        ]}
      />
      {mode === 'gif' ? (
        <GifPicker selected={b.gif} onPick={(g) => ex('banner', { gif: g.id, aspect: Math.min(BANNER_ASPECT_MAX, Math.max(BANNER_ASPECT_MIN, g.h / g.w)) })} />
      ) : (
        <>
          <Group title="Upload" hint="Taller pictures make a taller banner">
            <UploadButton label="Upload a banner" accept="image/png,image/jpeg,image/webp" busy={busy} onFile={upload} icon={ImagePlus} />
          </Group>
          <Group title="Colour" hint="Recent uploads on the right">
            <Swatches
              value={f.bannerKind === 'color' && !b.gif ? f.banner : '#000000'}
              options={ACCENT_SWATCHES}
              onChange={(v) => setBanner('color', v)}
              extra={
                recent.length > 0 && (
                  <>
                    <span aria-hidden="true" className="mx-1 h-6 w-px bg-line-strong" />
                    {recent.slice(0, 6).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setBanner('image', `/api/img/${r.id}`, Math.min(BANNER_ASPECT_MAX, Math.max(BANNER_ASPECT_MIN, r.aspect ?? BANNER_ASPECT_MIN)))}
                        aria-label="Use this recent banner again"
                        aria-pressed={current === r.id}
                        title="Recent banner"
                        className={cn('h-8 w-12 rounded-tile border-2 bg-cover bg-center transition-transform hover:scale-110', current === r.id ? 'border-paper' : 'border-white/10')}
                        style={{ backgroundImage: `url(/api/img/${r.id})` }}
                      />
                    ))}
                  </>
                )
              }
            />
          </Group>
          {f.bannerKind === 'color' && !b.gif && <Slider label="Grain" hint="Texture on the colour" value={b.noise} onChange={(noise) => ex('banner', { noise })} normal={0} />}
          <Group title="Ready-made">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {BANNER_PRESETS.map((p) => (
                <Tile key={p.id} label={p.label} on={!b.gif && f.bannerKind === 'preset' && f.banner === p.id} onClick={() => setBanner('preset', p.id)} className="h-14 overflow-hidden">
                  <span className="absolute inset-0 rounded-[inherit]" style={bannerStyle('preset', p.id)} />
                </Tile>
              ))}
            </div>
          </Group>
        </>
      )}
    </div>
  )
}

// ================================================================= card
export const EFFECT_ICONS: Record<string, LucideIcon> = { none: Ban, snow: Snowflake, rain: CloudRain, embers: Flame, sparkle: Sparkles, stars: Star, aurora: Waves, fireflies: Bug, petals: Flower2, bubbles: CircleDot, lightning: Zap, smoke: Wind, leaves: Leaf, confetti: PartyPopper, fireworks: Rocket, rays: Sun, caustics: Droplets, code: Binary, film: Film, vhs: Tv }

export function CardPanel({ s }: { s: Studio }) {
  const { f, ex } = s
  const set = <K extends keyof ProfileView>(k: K, v: ProfileView[K]) => s.setF((c) => (c ? { ...c, [k]: v } : c))
  return (
    <div className="grid gap-7">
      <Group title="Card colours" hint="The card is tinted with these">
        <div className="grid gap-4">
          <Swatches label="Primary" value={f.accent} options={ACCENT_SWATCHES} onChange={(v) => set('accent', v)} />
          <Swatches label="Accent" value={f.accent2} options={ACCENT_SWATCHES} onChange={(v) => set('accent2', v)} />
        </div>
      </Group>
      <Group title="Card effect" hint="Moves over the whole card">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {CARD_EFFECTS.map((o) => {
            const Icon = EFFECT_ICONS[o.id] ?? Ban
            return (
              <Tile key={o.id} on={f.cardEffect === o.id} onClick={() => set('cardEffect', o.id)} className="flex flex-col items-center gap-1 px-1 py-2.5 text-[11px]">
                <Icon className="size-[18px]" />
                {o.label}
              </Tile>
            )
          })}
        </div>
      </Group>
      {f.cardEffect !== 'none' && (
        <div className="grid gap-4 rounded-2xl border border-line bg-ink/50 p-4">
          <Slider label="Intensity" hint="How much there is" value={f.effectIntensity} onChange={(v) => set('effectIntensity', v)} normal={50} />
          <Slider label="Speed" hint="How fast it moves" value={f.effectSpeed} onChange={(v) => set('effectSpeed', v)} normal={50} />
          <Swatches label="Tint" value={f.extras.effectTint.color} options={DOT_SWATCHES} onChange={(color) => ex('effectTint', { color, amount: f.extras.effectTint.amount || 35 })} />
          <Slider label="Tint strength" hint="A gentle wash of the tint" value={f.extras.effectTint.amount} onChange={(amount) => ex('effectTint', { amount })} normal={0} />
        </div>
      )}
    </div>
  )
}

// ================================================================= background
const BG_KIND_OPTIONS: { id: BgKind; label: string }[] = [
  { id: 'default', label: 'Site' },
  { id: 'effect', label: 'Effect' },
  { id: 'color', label: 'Colour' },
  { id: 'image', label: 'Picture' },
  { id: 'gif', label: 'GIF' },
  { id: 'video', label: 'Video' },
]

export function BackgroundPanel({ s }: { s: Studio }) {
  const { f, ex } = s
  const g = f.extras.bg
  const o = f.extras.overlay
  const [busy, setBusy] = useState<'image' | 'video' | null>(null)
  const [bump, setBump] = useState(0)
  const recentPics = useRecent('background', bump)
  const [videoFrom, setVideoFrom] = useState<'upload' | 'giphy'>(/^[0-9a-f-]{36}$/.test(g.video) || !g.video ? 'upload' : 'giphy')
  const up = async (kind: 'image' | 'video', file: File) => {
    setBusy(kind)
    try {
      if (kind === 'image') ex('bg', { image: await uploadBackground(file), kind: 'image' })
      else ex('bg', { video: await uploadBgVideo(file), kind: 'video' })
      setBump((x) => x + 1)
    } catch (e) {
      s.onError(err(e, 'Upload failed.'))
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="grid gap-7">
      <Segmented label="Kind of background" layoutId="seg-bg" value={g.kind} onChange={(kind) => ex('bg', { kind })} options={BG_KIND_OPTIONS} />
      {g.kind === 'default' && <p className="-mt-3 text-sm text-mute">Your page uses the site&apos;s own background. Pick another kind above to make it yours.</p>}

      {g.kind === 'effect' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {BG_EFFECTS.map((e) => (
              <Tile key={e.id} on={g.effect === e.id} onClick={() => ex('bg', { effect: e.id })} className="px-2.5 py-2.5 text-left">
                <span className="block text-[13px] text-paper">{e.label}</span>
                <span className="block text-[10px] leading-tight">{e.note}</span>
              </Tile>
            ))}
          </div>
          <Swatches label="Effect colour" value={f.dotColor} options={DOT_SWATCHES} onChange={(v) => s.setF((c) => (c ? { ...c, dotColor: v } : c))} />
          <Swatches label="Colour behind it" value={g.color} options={['#000000', '#0b0b10', '#0d0a1a', '#0a1420', '#170a10', '#0a1a12']} onChange={(color) => ex('bg', { color })} />
          <Slider label="Intensity" value={g.intensity} onChange={(intensity) => ex('bg', { intensity })} normal={50} />
          <Slider label="Speed" value={g.speed} onChange={(speed) => ex('bg', { speed })} normal={50} />
        </>
      )}

      {g.kind === 'color' && (
        <>
          <Swatches label="Colour" value={g.color} options={['#000000', '#0b0b10', '#14141c', '#1d1033', '#0b2340', '#3a0d1f', '#0f2e1f', '#3b2a0a', ...ACCENT_SWATCHES.slice(2, 6)]} onChange={(color) => ex('bg', { color })} />
          <Slider label="Grain" hint="Texture on the colour" value={g.noise} onChange={(noise) => ex('bg', { noise })} normal={0} />
        </>
      )}

      {g.kind === 'image' && (
        <Group title="Picture" hint="Recent uploads on the right">
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton label="Upload a picture" accept="image/png,image/jpeg,image/webp" busy={busy === 'image'} onFile={(file) => up('image', file)} icon={ImagePlus} />
            {recentPics.map((r) => (
              <button key={r.id} type="button" onClick={() => ex('bg', { image: r.id })} aria-pressed={g.image === r.id} aria-label="Use this recent background" className={cn('h-10 w-14 rounded-tile border-2 bg-cover bg-center', g.image === r.id ? 'border-paper' : 'border-white/10')} style={{ backgroundImage: `url(/api/img/${r.id})` }} />
            ))}
          </div>
        </Group>
      )}

      {g.kind === 'gif' && <GifPicker selected={g.gif} onPick={(x) => ex('bg', { gif: x.id })} />}

      {g.kind === 'video' && (
        <>
          <Segmented
            label="Where the video comes from"
            layoutId="seg-video"
            value={videoFrom}
            onChange={setVideoFrom}
            options={[
              { id: 'upload', label: 'My video' },
              { id: 'giphy', label: 'GIPHY clip' },
            ]}
          />
          {videoFrom === 'upload' ? (
            <Group title="A short loop" hint="MP4 or WebM, under 1.3 MB">
              <UploadButton label="Upload a video" accept="video/mp4,video/webm" busy={busy === 'video'} onFile={(file) => up('video', file)} icon={Video} />
              <p className="mt-2 text-xs text-mute">It plays silently on repeat. A few seconds at a small size works best.</p>
            </Group>
          ) : (
            <GifPicker selected={g.video} onPick={(x) => ex('bg', { video: x.id })} />
          )}
        </>
      )}

      {g.kind !== 'default' && g.kind !== 'color' && <Slider label="Darken" hint="Keeps your card easy to read" value={g.dim} onChange={(dim) => ex('bg', { dim })} normal={35} />}

      <div className="border-t border-line pt-6">
        <Group title="Overlay" hint="Floats over the whole page">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {OVERLAY_EFFECTS.map((e) => {
              const Icon = EFFECT_ICONS[e.id] ?? Ban
              return (
                <Tile key={e.id} on={o.effect === e.id} onClick={() => ex('overlay', { effect: e.id })} className="flex flex-col items-center gap-1 px-1 py-2.5 text-[11px]">
                  <Icon className="size-[18px]" />
                  {e.label}
                </Tile>
              )
            })}
          </div>
        </Group>
        {o.effect !== 'none' && (
          <div className="mt-4 grid gap-4 rounded-2xl border border-line bg-ink/50 p-4">
            <Slider label="Intensity" value={o.intensity} onChange={(intensity) => ex('overlay', { intensity })} normal={40} />
            <Slider label="Speed" value={o.speed} onChange={(speed) => ex('overlay', { speed })} normal={50} />
            <Swatches label="Tint" value={o.tint} options={DOT_SWATCHES} onChange={(tint) => ex('overlay', { tint, tintAmount: o.tintAmount || 35 })} />
            <Slider label="Tint strength" value={o.tintAmount} onChange={(tintAmount) => ex('overlay', { tintAmount })} normal={0} />
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================================= badges
export function BadgesPanel({ s, unlocked }: { s: Studio; unlocked: string[] }) {
  const [saving, setSaving] = useState(false)
  const save = async (next: string[]) => {
    const before = s.f.badges
    s.setF((c) => (c ? { ...c, badges: next } : c))
    setSaving(true)
    try {
      const res = await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ badges: next }) })
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not save.')
      window.dispatchEvent(new CustomEvent('logoless:badges-saved', { detail: next }))
    } catch (e) {
      s.setF((c) => (c ? { ...c, badges: before } : c))
      s.onError(err(e, 'Could not save.'))
    } finally {
      setSaving(false)
    }
  }
  return (
    <div>
      <BadgeBoard compact unlocked={unlocked} equipped={s.f.badges.filter((b) => unlocked.includes(b))} onChange={save} saving={saving} />
      <p className="mt-4 text-xs text-mute">Badges save as soon as you move them. See every badge on the <a href="/dashboard/achievements" className="underline underline-offset-4 hover:text-paper">Achievements</a> page.</p>
    </div>
  )
}

