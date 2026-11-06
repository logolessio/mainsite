'use client'

import { Check, ImagePlus, Sparkles, Trash2, Video } from 'lucide-react'
import { useRef, useState } from 'react'
import { BioPage } from '@/components/bio/bio-page'
import { fontClass } from '@/components/bio/bits'
import { GifPicker } from '@/components/profile/gif-picker'
import { AVATAR_SHAPES, BG_KINDS, BUTTON_STYLES, CARD_STYLES, GRADIENT_STYLES, LAYOUTS, NAME_STYLES, PRESETS, applyPreset, hslHex } from '@/lib/bio'
import { uploadBackground, uploadBgVideo } from '@/lib/image-client'
import { cn } from '@/lib/utils'
import { ArrangePanel } from './panel-arrange'
import type { EditorApi } from './types'
import { Btn, ColorField, Group, Row, Seg, Slider, Switch } from './ui'

const FONTS = [
  ['quicksand', 'Rounded'],
  ['jelly', 'Jellybean'],
  ['geist', 'Geist'],
  ['funnel', 'Funnel'],
  ['bricolage', 'Bricolage'],
  ['special', 'Expanded'],
  ['syne', 'Syne'],
  ['unbounded', 'Unbounded'],
  ['grotesk', 'Grotesk'],
  ['condensed', 'Poster'],
  ['serif', 'Serif'],
  ['newsreader', 'Newsreader'],
  ['gloock', 'Gloock'],
  ['young', 'Young Serif'],
  ['mono', 'Mono'],
  ['martian', 'Martian'],
  ['modern', 'Modern'],
  ['tempo', 'Tempo'],
  ['bit8', '8-Bit'],
  ['script', 'Script'],
  ['hand', 'Handwritten'],
] as const

/** A small picture of one layout, drawn by the real page. */
function Thumb({ api, layout }: { api: EditorApi; layout: string }) {
  const { cfg, profile } = api
  const data = {
    handle: profile.handle,
    name: profile.name || 'Your name',
    bio: profile.bio,
    avatar: profile.newAvatar ? `/api/img/${profile.newAvatar}` : profile.hasAvatar ? profile.avatar : null,
    views: null,
    config: { ...cfg, layout: layout as typeof cfg.layout, fx: { ...cfg.fx, enter: 'none' as const, grain: 0, scanlines: 0, reveal: 'none' as const, spotlight: false, float: false }, cursor: { ...cfg.cursor, trail: 'none' as const }, audio: { ...cfg.audio, id: '' }, overlay: { ...cfg.overlay, effect: 'none' as const } },
  }
  return (
    <div className="pointer-events-none absolute top-0 left-0 origin-top-left" style={{ width: 390, height: 520, transform: 'scale(0.4)' }}>
      <BioPage mode="mini" data={data} />
    </div>
  )
}

/** The picture across the top of the card in the Card layout. */
function BannerPicker({ api }: { api: EditorApi }) {
  const { cfg, up, toast } = api
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const has = Boolean(cfg.card.banner)
  const pick = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    try {
      up('card', { banner: await uploadBackground(f) })
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't upload that. try again.")
    }
    setBusy(false)
  }
  return (
    <div className="flex items-center gap-3">
      <span className="relative block h-12 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--ed-line2)] bg-white/[0.05]" style={has ? { background: `center / cover no-repeat url(/api/img/${cfg.card.banner})` } : undefined}>
        {!has && <span className="absolute inset-0 bg-gradient-to-br from-white/25 to-white/5" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        <Btn onClick={() => ref.current?.click()} disabled={busy}>
          <ImagePlus className="size-3.5" /> {has ? 'Change banner' : 'Banner picture'}
        </Btn>
        {has && (
          <Btn variant="quiet" onClick={() => up('card', { banner: '' })}>
            <Trash2 className="size-3.5" /> Remove
          </Btn>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => (void pick(e.target.files?.[0]), (e.target.value = ''))} />
    </div>
  )
}

export function LayoutPanel({ api }: { api: EditorApi }) {
  const { cfg, set, up } = api
  return (
    <div>
      {cfg.layout === 'canvas' && <ArrangePanel api={api} />}
      <Group title="Layout" hint="four ways to lay out the same page. your links and words stay put.">
        <div className="grid grid-cols-2 gap-3">
          {LAYOUTS.map((l) => {
            const on = cfg.layout === l.id
            return (
              <button key={l.id} type="button" onClick={() => set((c) => ({ ...c, layout: l.id }))} aria-pressed={on} className="group text-left">
                <span className={cn('relative block h-[12.5rem] overflow-hidden rounded-2xl border bg-black transition-[border-color,transform] duration-200 group-hover:-translate-y-0.5', on ? 'border-white' : 'border-[var(--ed-line)] group-hover:border-white/40')}>
                  <Thumb api={api} layout={l.id} />
                  {on && (
                    <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-white text-black">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="mt-2 block text-[0.8rem] text-white">{l.name}</span>
                <span className="block text-[0.7rem] leading-snug text-[var(--ed-mute)]">{l.note}</span>
              </button>
            )
          })}
        </div>
      </Group>
      <Group title="Card" hint="The floating card your profile sits on.">
        {cfg.layout === 'card' && <BannerPicker api={api} />}
        <Seg value={cfg.card.style} options={CARD_STYLES} onChange={(v) => up('card', { style: v })} />
        {cfg.card.style === 'glass' && (
          <>
            <Row label="Blur" value={cfg.card.blur}>
              <Slider label="Card blur" value={cfg.card.blur} max={60} onChange={(v) => up('card', { blur: v })} />
            </Row>
            <Row label="Frost" value={cfg.card.opacity}>
              <Slider label="Card frost" value={cfg.card.opacity} onChange={(v) => up('card', { opacity: v })} />
            </Row>
          </>
        )}
        <Row label="Width" value={`${cfg.card.width}px`}>
          <Slider label="Card width" min={300} max={640} step={10} value={cfg.card.width} onChange={(v) => up('card', { width: v })} />
        </Row>
        <Row label="Roundness" value={cfg.theme.radius}>
          <Slider label="Roundness" max={40} value={cfg.theme.radius} onChange={(v) => up('theme', { radius: v })} />
        </Row>
        <Switch checked={cfg.card.glare} onChange={(v) => up('card', { glare: v })} label="Light on its face" hint="A soft shine that slides across the card as it turns." />
      </Group>
      <Group title="3D" hint="The card turns towards the pointer, and its pieces stand off it at different depths.">
        <Switch checked={cfg.fx.tilt} onChange={(v) => up('fx', { tilt: v })} label="Turn towards the pointer" />
        <Row label="Depth" value={cfg.fx.depth}>
          <Slider label="3D depth" value={cfg.fx.depth} onChange={(v) => up('fx', { depth: v })} />
        </Row>
        <Switch checked={cfg.fx.float} onChange={(v) => up('fx', { float: v })} label="Drift" hint="The card floats up and down a little." />
      </Group>
    </div>
  )
}

export function StylePanel({ api }: { api: EditorApi }) {
  const { cfg, up } = api
  const t = cfg.theme
  return (
    <div>
      <Group title="Your colours" hint="Switch these on to colour the whole page. The background, the buttons, your name and the effects all pick them up.">
        <Switch checked={cfg.colors.on} onChange={(v) => up('colors', { on: v })} label="Use my own colours" />
        {cfg.colors.on && (
          <>
            <div className="grid grid-cols-6 gap-2" role="group" aria-label="Colour palettes">
              {PRESETS.filter((p) => p.hues).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.name}
                  aria-label={`${p.name} palette`}
                  onClick={() => up('colors', { ...p.set.colors, on: true })}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--ed-line2)] transition-[transform,border-color] duration-200 hover:-translate-y-px hover:border-white/50"
                  style={{ background: `linear-gradient(135deg, ${p.hues![0]} 0%, ${p.hues![1]} 100%)` }}
                >
                  <span className="absolute bottom-1.5 left-1.5 size-2.5 rounded-full" style={{ background: p.hues![2] }} />
                  <span className="absolute right-1.5 bottom-1.5 size-2.5 rounded-full" style={{ background: p.hues![3] }} />
                </button>
              ))}
            </div>
            <div className="grid gap-3">
              <ColorField label="Background" value={cfg.colors.bg} onChange={(v) => up('colors', { bg: v })} />
              <ColorField label="Second background" value={cfg.colors.bg2} onChange={(v) => up('colors', { bg2: v })} />
              <ColorField label="Text" value={cfg.colors.text} onChange={(v) => up('colors', { text: v })} />
              <ColorField label="Accent" value={cfg.colors.accent} onChange={(v) => up('colors', { accent: v })} />
              <ColorField label="Second accent" value={cfg.colors.accent2} onChange={(v) => up('colors', { accent2: v })} />
            </div>
            <Btn
              onClick={() => {
                const h = Math.floor(Math.random() * 360)
                const gap = 40 + Math.floor(Math.random() * 120)
                up('colors', { bg: hslHex(h, 0.45, 0.05), bg2: hslHex(h, 0.5, 0.16), text: hslHex(h, 0.25, 0.96), accent: hslHex(h, 0.85, 0.62), accent2: hslHex((h + gap) % 360, 0.85, 0.6) })
              }}
            >
              <Sparkles className="size-3.5" /> Surprise me
            </Btn>
          </>
        )}
      </Group>
      {!cfg.colors.on && (
        <Group title="Page tone" hint="Black to white. The text flips by itself to stay readable.">
          <Slider tone label="Page tone" value={t.tone} onChange={(v) => api.set((c) => ({ ...c, theme: { ...c.theme, tone: v }, bg: { ...c.bg, tone: v } }))} />
        </Group>
      )}
      <Group title="Typeface">
        <div className="grid grid-cols-2 gap-2">
          {FONTS.map(([id, name]) => (
            <button key={id} type="button" onClick={() => up('theme', { font: id })} aria-pressed={t.font === id} className={cn('flex h-12 items-center justify-between rounded-xl border px-3 text-[1.05rem] transition-colors', t.font === id ? 'border-white bg-white/[0.06]' : 'border-[var(--ed-line)] text-white/70 hover:border-white/40 hover:text-white')}>
              <span className={fontClass(id)}>{name}</span>
              {t.font === id && <Check className="size-3.5" />}
            </button>
          ))}
        </div>
      </Group>
      <Group title="Name">
        <div className="grid grid-cols-4 gap-1.5">
          {NAME_STYLES.map((n) => (
            <button key={n.id} type="button" onClick={() => up('theme', { nameStyle: n.id })} aria-pressed={t.nameStyle === n.id} className={cn('h-9 rounded-lg border text-[0.74rem] transition-colors', t.nameStyle === n.id ? 'border-white bg-white text-black' : 'border-[var(--ed-line)] text-[var(--ed-mute)] hover:text-white')}>
              {n.name}
            </button>
          ))}
        </div>
      </Group>
      <Group title="Buttons">
        <div className="grid grid-cols-3 gap-1.5">
          {BUTTON_STYLES.map((b) => (
            <button key={b.id} type="button" onClick={() => up('theme', { buttons: b.id })} aria-pressed={t.buttons === b.id} className={cn('h-9 rounded-lg border text-[0.76rem] transition-colors', t.buttons === b.id ? 'border-white bg-white text-black' : 'border-[var(--ed-line)] text-[var(--ed-mute)] hover:text-white')}>
              {b.name}
            </button>
          ))}
        </div>
        <Row label="Roundness" value={t.radius}>
          <Slider label="Roundness" max={40} value={t.radius} onChange={(v) => up('theme', { radius: v })} />
        </Row>
        <Row label="Size">
          <Seg value={t.size} options={[{ id: 'compact', name: 'Compact' }, { id: 'comfortable', name: 'Regular' }, { id: 'large', name: 'Large' }]} onChange={(v) => up('theme', { size: v })} />
        </Row>
      </Group>
      <Group title="Social icons">
        <Seg value={t.icons} options={[{ id: 'glow', name: 'Glow' }, { id: 'plain', name: 'Plain' }, { id: 'boxed', name: 'Boxed' }]} onChange={(v) => up('theme', { icons: v })} />
      </Group>
      <Group title="Picture">
        <Seg value={cfg.avatar.shape} options={AVATAR_SHAPES} onChange={(v) => up('avatar', { shape: v })} />
        <Row label="Size" value={cfg.avatar.size}>
          <Slider label="Picture size" min={60} max={180} value={cfg.avatar.size} onChange={(v) => up('avatar', { size: v })} />
        </Row>
        <Switch checked={cfg.avatar.ring} onChange={(v) => up('avatar', { ring: v })} label="Ring" />
        <Switch checked={cfg.avatar.float} onChange={(v) => up('avatar', { float: v })} label="Float" hint="A slow drift up and down." />
        <Switch checked={cfg.avatar.gray} onChange={(v) => up('avatar', { gray: v })} label="Turn it to grey" hint="Off keeps your picture in colour." />
      </Group>
    </div>
  )
}

export function BackgroundPanel({ api }: { api: EditorApi }) {
  const { cfg, up, toast } = api
  const bg = cfg.bg
  const imgRef = useRef<HTMLInputElement>(null)
  const vidRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const media = bg.kind === 'image' || bg.kind === 'gif' || bg.kind === 'video'
  const pick = async (f: File | undefined, kind: 'image' | 'video') => {
    if (!f) return
    setBusy(true)
    try {
      if (kind === 'image') up('bg', { image: await uploadBackground(f), kind: 'image' })
      else up('bg', { video: await uploadBgVideo(f), kind: 'video' })
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't upload that. try again.")
    }
    setBusy(false)
  }
  return (
    <div>
      <Group title="Background">
        <Seg value={bg.kind} options={BG_KINDS} cols={3} onChange={(v) => up('bg', { kind: v })} />
        {!media && <p className="text-[0.74rem] leading-snug text-[var(--ed-mute)]">The background stays still. For snow, embers, smoke and more, see Effects.</p>}
        {bg.kind === 'tone' && cfg.colors.on && <ColorField label="Background colour" value={cfg.colors.bg} onChange={(v) => up('colors', { bg: v })} />}
        {bg.kind === 'tone' && !cfg.colors.on && (
          <Row label="Tone" value={bg.tone}>
            <Slider tone label="Background tone" value={bg.tone} onChange={(v) => api.set((c) => ({ ...c, theme: { ...c.theme, tone: v }, bg: { ...c.bg, tone: v } }))} />
          </Row>
        )}
        {bg.kind === 'gradient' && (
          <>
            <Seg value={bg.gradient} options={GRADIENT_STYLES} onChange={(v) => up('bg', { gradient: v })} />
            {cfg.colors.on && (
              <div className="grid gap-3">
                <ColorField label="From" value={cfg.colors.bg} onChange={(v) => up('colors', { bg: v })} />
                <ColorField label="To" value={cfg.colors.bg2} onChange={(v) => up('colors', { bg2: v })} />
              </div>
            )}
            {!cfg.colors.on && <Row label="From" value={bg.tone}>
              <Slider tone label="Gradient from" value={bg.tone} onChange={(v) => api.set((c) => ({ ...c, theme: { ...c.theme, tone: v }, bg: { ...c.bg, tone: v } }))} />
            </Row>
            }
            {!cfg.colors.on && <Row label="To" value={bg.tone2}>
              <Slider tone label="Gradient to" value={bg.tone2} onChange={(v) => up('bg', { tone2: v })} />
            </Row>}
            {bg.gradient !== 'radial' && bg.gradient !== 'mesh' && (
              <Row label="Angle" value={`${bg.angle}°`}>
                <Slider label="Gradient angle" max={360} value={bg.angle} onChange={(v) => up('bg', { angle: v })} />
              </Row>
            )}
          </>
        )}
        {bg.kind === 'image' && (
          <div className="flex items-center gap-3">
            <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0], 'image')} />
            {bg.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/img/${bg.image}`} alt="" className="size-14 rounded-lg border border-[var(--ed-line)] object-cover" />
            )}
            <Btn onClick={() => imgRef.current?.click()} disabled={busy}>
              <ImagePlus className="size-4" /> {bg.image ? 'Change picture' : 'Upload a picture'}
            </Btn>
            {bg.image && (
              <Btn variant="quiet" onClick={() => up('bg', { image: '' })}>
                <Trash2 className="size-4" />
              </Btn>
            )}
          </div>
        )}
        {bg.kind === 'video' && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input ref={vidRef} type="file" accept="video/mp4,video/webm" hidden onChange={(e) => void pick(e.target.files?.[0], 'video')} />
              <Btn onClick={() => vidRef.current?.click()} disabled={busy}>
                <Video className="size-4" /> {bg.video ? 'Change video' : 'Upload a video'}
              </Btn>
              {bg.video && (
                <Btn variant="quiet" onClick={() => up('bg', { video: '' })}>
                  <Trash2 className="size-4" />
                </Btn>
              )}
            </div>
            <p className="text-[0.74rem] text-[var(--ed-mute)]">MP4 or WebM under 1.3 MB: a few seconds, small, looping.</p>
          </div>
        )}
        {bg.kind === 'gif' && (
          <div className="max-h-72 overflow-auto rounded-xl border border-[var(--ed-line)] p-2">
            <GifPicker selected={bg.gif} onPick={(g) => up('bg', { gif: g.id, kind: 'gif' })} />
          </div>
        )}
      </Group>
      <Group title="Finish">
        {media && <Switch checked={bg.mono} onChange={(v) => up('bg', { mono: v })} label="Turn it to grey" hint="Off keeps the colours of your picture or video." />}
        <Row label="Blur" value={`${bg.blur}px`}>
          <Slider label="Background blur" max={40} value={bg.blur} onChange={(v) => up('bg', { blur: v })} />
        </Row>
        <Row label="Darken" value={bg.dim}>
          <Slider label="Darken" max={90} value={bg.dim} onChange={(v) => up('bg', { dim: v })} />
        </Row>
        <Row label="Dark edges" value={bg.vignette}>
          <Slider label="Dark edges" value={bg.vignette} onChange={(v) => up('bg', { vignette: v })} />
        </Row>
        <Row label="Lean with the pointer" value={bg.parallax}>
          <Slider label="Background lean" value={bg.parallax} onChange={(v) => up('bg', { parallax: v })} />
        </Row>
      </Group>
    </div>
  )
}
