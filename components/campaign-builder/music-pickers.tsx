'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ImagePlus, Loader2, Music2, Pause, Play, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { BigInput, Label } from '@/components/invite/bits'
import { soundLink, spotifyLink } from '@/lib/campaign-extras-shared'
import { uploadAudio, uploadImage } from '@/lib/image-client'
import { cn } from '@/lib/utils'

const field = 'flex h-14 items-center gap-3 rounded-2xl border border-line-strong bg-white/[0.035] px-4 text-[15px] transition-colors focus-within:border-paper/60 focus-within:bg-white/[0.06]'

/**
 * A list of links, one per row, each checked as it is typed (Spotify links, or the official sound). A good link shows what it
 * is; a bad one says why in plain words. Rows can be added up to `max`.
 */
export function LinkList({ label, hint, icon, values, onChange, check, max, placeholder }: { label: string; hint?: string; icon: string; values: string[]; onChange: (v: string[]) => void; check: typeof spotifyLink; max: number; placeholder: string }) {
  const rows = values.length ? values : ['']
  const set = (i: number, v: string) => onChange(rows.map((x, j) => (j === i ? v : x)))
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      <div className="grid gap-2.5">
        {rows.map((v, i) => {
          const r = v.trim() ? check(v) : null
          return (
            <div key={i}>
              <div className={cn(field, r && 'error' in r && 'border-signal/60')}>
                <BrandIcon name={icon} className="size-5 shrink-0 text-mute" />
                <input aria-label={`${label} ${i + 1}`} value={v} onChange={(e) => set(i, e.target.value.trim())} placeholder={placeholder} inputMode="url" autoCapitalize="none" spellCheck={false} maxLength={300} className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-mute/60" />
                {r && 'url' in r && (
                  <span className="hidden shrink-0 items-center gap-1 rounded-pill bg-emerald-400/15 px-2.5 py-1 text-xs text-emerald-300 sm:inline-flex">
                    <Check aria-hidden="true" className="size-3" /> {r.kind}
                  </span>
                )}
                {(rows.length > 1 || v) && (
                  <button type="button" aria-label="Remove this link" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="grid size-8 shrink-0 place-items-center rounded-pill text-mute transition-colors hover:bg-white/10 hover:text-paper">
                    <X className="size-4" />
                  </button>
                )}
              </div>
              {r && 'error' in r && <p className="mt-1.5 text-xs text-signal">{r.error}</p>}
            </div>
          )
        })}
      </div>
      {rows.length < max && rows[rows.length - 1]?.trim() && (
        <button type="button" onClick={() => onChange([...rows, ''])} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-pill border border-line-strong px-4 text-sm text-mute transition-colors hover:border-paper/50 hover:text-paper">
          <Plus aria-hidden="true" className="size-4" /> Add another
        </button>
      )}
    </div>
  )
}

/** Choose the audio: the official sound to use, which part of it, and a short preview creators can play on the campaign page. */
export function AudioPicker({ sounds, audio, audioNote, onChange, preview = false }: { sounds: string[]; audio: string; audioNote: string; onChange: (p: { sounds?: string[]; audio?: string; audioNote?: string }) => void; preview?: boolean }) {
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const [local, setLocal] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const el = useRef<HTMLAudioElement>(null)
  const src = local ?? (audio ? `/api/audio/${audio}` : null)
  useEffect(() => () => void (local && URL.revokeObjectURL(local)), [local])

  const pick = async (f?: File | null) => {
    if (!f) return
    setErr('')
    if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|ogg|wav)$/i.test(f.name)) return setErr('Use an MP3, M4A, OGG or WAV file.')
    setBusy(true)
    try {
      const up = preview ? 'preview' : await uploadAudio(f)
      setLocal(URL.createObjectURL(f))
      setName(f.name)
      onChange({ audio: preview ? '' : up })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed.')
    }
    setBusy(false)
  }
  const toggle = () => {
    const a = el.current
    if (!a) return
    if (a.paused) void a.play()
    else a.pause()
  }

  return (
    <div className="grid gap-7">
      <LinkList label="The official sound" hint="Optional · up to 4" icon="tiktok" values={sounds} onChange={(v) => onChange({ sounds: v })} check={soundLink} max={4} placeholder="Paste the TikTok sound or Instagram audio link" />
      <BigInput label="Which part should creators use?" hint="Optional" value={audioNote} maxLength={200} onChange={(e) => onChange({ audioNote: e.target.value })} placeholder="e.g. The chorus from 0:42 to 1:05" />
      <div>
        <Label hint="MP3 or M4A · up to 1 MB">A short preview to play on the campaign</Label>
        <div className={cn('flex items-center gap-4 rounded-3xl border border-dashed border-line-strong bg-white/[0.03] p-4 transition-colors', src && 'border-solid')}>
          {src ? (
            <>
              <audio ref={el} src={src} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
              <button type="button" onClick={toggle} aria-label={playing ? 'Pause the preview' : 'Play the preview'} className="grid size-12 shrink-0 place-items-center rounded-pill bg-paper text-ink transition-transform active:scale-95">
                {playing ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px]">{name || 'Your preview'}</p>
                <Bars on={playing} />
              </div>
              <label htmlFor={id} className="cursor-pointer text-sm text-mute underline underline-offset-4 hover:text-paper">
                Change
              </label>
              <button
                type="button"
                aria-label="Remove the preview"
                onClick={() => {
                  setLocal(null)
                  setName('')
                  onChange({ audio: '' })
                }}
                className="grid size-9 place-items-center rounded-pill text-mute hover:bg-white/10 hover:text-paper"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          ) : (
            <label htmlFor={id} className="flex flex-1 cursor-pointer items-center gap-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => (e.preventDefault(), void pick(e.dataTransfer.files?.[0]))}>
              <span className="grid size-12 shrink-0 place-items-center rounded-pill border border-line-strong">{busy ? <Loader2 className="size-5 animate-spin" /> : <Music2 className="size-5" />}</span>
              <span className="text-[15px] text-mute">{busy ? 'Uploading…' : 'Drop a short clip of the song, or choose a file'}</span>
            </label>
          )}
          <input id={id} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
        </div>
        {err && <p className="mt-2 text-sm text-signal">{err}</p>}
      </div>
    </div>
  )
}

/** A few bars that dance while the preview plays. */
function Bars({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className="mt-2 flex h-4 items-end gap-[3px]">
      {Array.from({ length: 22 }, (_, i) => (
        <motion.span key={i} className="w-[3px] rounded-pill bg-paper/60" animate={on ? { height: [4, 6 + ((i * 7) % 10), 4] } : { height: 4 }} transition={on ? { duration: 0.6 + (i % 5) * 0.12, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }} />
      ))}
    </span>
  )
}

/** Album cover (square) and an optional wide background, side by side, with a live look at how they sit together. */
export function ArtPicker({ cover, background, onChange, preview = false, title, creator }: { cover: string; background: string; onChange: (p: { cover?: string; background?: string }) => void; preview?: boolean; title: string; creator: string }) {
  const [busy, setBusy] = useState<'cover' | 'background' | null>(null)
  const [err, setErr] = useState('')
  const [local, setLocal] = useState<{ cover?: string; background?: string }>({})
  const coverSrc = local.cover ?? (cover ? `/api/img/${cover}` : null)
  const bgSrc = local.background ?? (background ? `/api/img/${background}` : null)

  const pick = async (kind: 'cover' | 'background', f?: File | null) => {
    if (!f) return
    setErr('')
    if (!f.type.startsWith('image/')) return setErr('Pick a picture (JPEG, PNG or WebP).')
    setBusy(kind)
    try {
      const up = preview ? '' : await uploadImage(kind, f)
      setLocal((l) => ({ ...l, [kind]: URL.createObjectURL(f) }))
      onChange({ [kind]: up })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed.')
    }
    setBusy(null)
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <Drop label="Album cover" hint="Square, at least 900 × 900" src={coverSrc} busy={busy === 'cover'} onFile={(f) => pick('cover', f)} className="aspect-square w-44 sm:w-48" />
        <Drop
          label="Background"
          hint="Optional · wide picture"
          src={bgSrc}
          busy={busy === 'background'}
          onFile={(f) => pick('background', f)}
          onClear={
            bgSrc
              ? () => {
                  setLocal((l) => ({ ...l, background: undefined }))
                  onChange({ background: '' })
                }
              : undefined
          }
          className="aspect-video w-full"
        />
      </div>
      {err && <p className="text-sm text-signal">{err}</p>}
      <div>
        <Label>How it looks to creators</Label>
        <div className="relative overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line-strong">
          <AnimatePresence initial={false}>
            {bgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <motion.img key={bgSrc} src={bgSrc} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-[2px]" />
            ) : (
              <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgb(255_255_255/0.12),transparent_60%)]" />
            )}
          </AnimatePresence>
          <div className="relative flex items-center gap-5 bg-gradient-to-r from-ink/80 via-ink/40 to-transparent p-5 md:p-6">
            <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-white/10 shadow-2xl md:size-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {coverSrc ? <img src={coverSrc} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-mute"><ImagePlus className="size-6" /></span>}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-3xl">{title || 'Your release'}</p>
              <p className="truncate text-mute">{creator || 'You'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Drop({ label, hint, src, busy, onFile, onClear, className }: { label: string; hint: string; src: string | null; busy: boolean; onFile: (f: File) => void; onClear?: () => void; className: string }) {
  const id = useId()
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <div className={cn('group relative', className)}>
        <label
          htmlFor={id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files?.[0]
            if (f) onFile(f)
          }}
          className="relative grid size-full cursor-pointer place-items-center overflow-hidden rounded-[calc(1.6rem*var(--round,1))] border border-dashed border-line-strong bg-white/[0.03] transition-colors hover:border-paper/60 hover:bg-white/[0.06]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src && <img src={src} alt="" className="absolute inset-0 size-full object-cover" />}
          <span className={cn('relative z-10 flex flex-col items-center gap-2 px-4 text-center text-sm', src ? 'rounded-pill bg-black/60 px-4 py-2 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100' : 'text-mute')}>
            {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            {busy ? 'Uploading…' : src ? 'Change' : hint}
          </span>
          <input id={id} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {onClear && (
          <button type="button" aria-label={`Remove the ${label.toLowerCase()}`} onClick={onClear} className="absolute top-2 right-2 z-20 grid size-8 place-items-center rounded-pill bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80">
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
