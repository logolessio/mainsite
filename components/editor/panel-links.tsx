'use client'

import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion'
import { Eye, EyeOff, GripVertical, Link2, Minus, Pin, Play, Plus, Trash2, Type, AlignLeft, Share2, ChevronDown, Copy, ImageIcon, Music2, Tag, CircleDot, ClipboardPaste } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type BioBlock, LINK_ANIMS, MAX_BLOCKS, blockFromPaste, cleanUrl, embedFor, newId, platformOf } from '@/lib/bio'
import { LINK_PLATFORMS, USERNAME_LINKS } from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import { BlockIcon } from '@/components/bio/bits'
import { IconPicker, SocialFields } from './account-fields'
import { ImageFields, MusicFields, StatusFields, TagsFields, blockThumb } from './block-fields'
import { HostFile } from './host-file'
import { lookUp } from './song-search'
import type { EditorApi } from './types'
import { Area, Btn, Input, Row, Seg, Switch } from './ui'

const KINDS = [
  { t: 'link', name: 'Link', icon: Link2 },
  { t: 'social', name: 'Social', icon: Share2 },
  { t: 'video', name: 'Video', icon: Play },
  { t: 'music', name: 'Music', icon: Music2 },
  { t: 'image', name: 'Picture', icon: ImageIcon },
  { t: 'tags', name: 'Tags', icon: Tag },
  { t: 'status', name: 'Status', icon: CircleDot },
  { t: 'heading', name: 'Heading', icon: Type },
  { t: 'text', name: 'Text', icon: AlignLeft },
  { t: 'divider', name: 'Divider', icon: Minus },
] as const

const blank = (t: BioBlock['t']): BioBlock => {
  const id = newId()
  switch (t) {
    case 'link':
      return { id, t, title: '', url: '', icon: 'auto', note: '', hidden: false, pin: false }
    case 'social':
      return { id, t, platform: 'instagram', url: '', hidden: false }
    case 'video':
      return { id, t, url: '', title: '', hidden: false }
    case 'music':
      return { id, t, url: '', title: '', hidden: false }
    case 'image':
      return { id, t, src: '', title: '', url: '', shape: 'auto', hidden: false }
    case 'tags':
      return { id, t, items: [], style: 'pill', hidden: false }
    case 'status':
      return { id, t, text: '', state: 'open', hidden: false }
    case 'heading':
      return { id, t, text: '' }
    case 'text':
      return { id, t, text: '' }
    default:
      return { id, t: 'divider' }
  }
}

const summary = (b: BioBlock) => {
  switch (b.t) {
    case 'link':
      return (b.emoji ? b.emoji + ' ' : '') + (b.title || b.url.replace(/^https?:\/\/(www\.)?/, '') || 'New link')
    case 'social':
      return LINK_PLATFORMS.find((p) => p.id === b.platform)?.label ?? b.platform
    case 'video':
      return b.title || b.url.replace(/^https?:\/\/(www\.)?/, '') || 'New video'
    case 'music':
      return [b.title, b.artist].filter(Boolean).join(' · ') || 'New song'
    case 'image':
      return b.title || 'Picture'
    case 'tags':
      return b.items.join(', ') || 'Tags'
    case 'status':
      return b.text || 'Status'
    case 'heading':
      return b.text || 'New heading'
    case 'text':
      return b.text.slice(0, 48) || 'New text'
    default:
      return 'Divider'
  }
}

function Item({ b, open, toggle, update, remove, duplicate, clicks, toast }: { b: BioBlock; open: boolean; toggle: () => void; update: (p: Partial<BioBlock>) => void; remove: () => void; duplicate: () => void; clicks?: number; toast: (m: string) => void }) {
  const drag = useDragControls()
  const hidden = 'hidden' in b && b.hidden
  const set = (p: Record<string, unknown>) => update(p as Partial<BioBlock>)
  return (
    <Reorder.Item value={b} dragListener={false} dragControls={drag} className="relative list-none" transition={{ type: 'spring', stiffness: 520, damping: 40 }}>
      <div className={cn('overflow-hidden rounded-xl border bg-[var(--ed-panel)] transition-colors', open ? 'border-white/30' : 'border-[var(--ed-line)]')}>
        <div className="flex items-center gap-1 px-1.5 py-1.5">
          <button type="button" aria-label="Drag to reorder" onPointerDown={(e) => drag.start(e)} className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-white/35 hover:text-white active:cursor-grabbing">
            <GripVertical className="size-4" />
          </button>
          <button type="button" onClick={toggle} className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-left">
            <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/[0.06] text-white/80">
              {blockThumb(b) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={blockThumb(b) as string} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
              ) : b.t === 'link' || b.t === 'social' ? (
                <BlockIcon block={b} className="size-[0.95rem]" />
              ) : (
                (() => {
                  const I = KINDS.find((k) => k.t === b.t)?.icon ?? Link2
                  return <I className="size-[0.95rem]" />
                })()
              )}
            </span>
            <span className={cn('min-w-0 flex-1 truncate text-[0.84rem]', hidden ? 'text-white/35 line-through' : 'text-white')}>{summary(b)}</span>
            {typeof clicks === 'number' && clicks > 0 && <span className="shrink-0 text-[0.7rem] tabular-nums text-white/40">{clicks.toLocaleString('en-US')}</span>}
          </button>
          {b.t === 'link' && (
            <button type="button" aria-label={b.pin ? 'Unpin' : 'Pin to the top'} aria-pressed={b.pin} onClick={() => set({ pin: !b.pin })} className={cn('grid size-8 place-items-center rounded-lg transition-colors', b.pin ? 'text-white' : 'text-white/30 hover:text-white')}>
              <Pin className="size-4" />
            </button>
          )}
          {'hidden' in b && (
            <button type="button" aria-label={b.hidden ? 'Show on the page' : 'Hide from the page'} onClick={() => set({ hidden: !b.hidden })} className="grid size-8 place-items-center rounded-lg text-white/30 transition-colors hover:text-white">
              {b.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
          {b.t !== 'divider' && (
            <button type="button" aria-label="Duplicate" title="Duplicate" onClick={duplicate} className="grid size-8 place-items-center rounded-lg text-white/30 transition-colors hover:text-white">
              <Copy className="size-4" />
            </button>
          )}
          <button type="button" aria-label="Delete" onClick={remove} className="grid size-8 place-items-center rounded-lg text-white/30 transition-colors hover:text-white">
            <Trash2 className="size-4" />
          </button>
          <button type="button" aria-label={open ? 'Close' : 'Edit'} aria-expanded={open} onClick={toggle} className="grid size-8 place-items-center rounded-lg text-white/40 hover:text-white">
            <ChevronDown className={cn('size-4 transition-transform duration-300', open && 'rotate-180')} />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }} className="overflow-hidden">
              <div className="space-y-3 border-t border-[var(--ed-line)] p-3">
                {b.t === 'link' && (
                  <>
                    <div className="flex gap-2">
                      <Input aria-label="Emoji" placeholder="🙂" value={b.emoji ?? ''} maxLength={8} onChange={(e) => set({ emoji: e.target.value })} className="w-14 shrink-0 px-0 text-center" />
                      <Input placeholder="Title" value={b.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
                    </div>
                    <Input placeholder="Link, like example.com/page" value={b.url} inputMode="url" autoCapitalize="off" spellCheck={false} onChange={(e) => set({ url: e.target.value })} onBlur={() => set({ url: cleanUrl(b.url) || b.url, ...(b.title ? {} : { title: titleFor(b.url) }) })} />
                    <HostFile
                      url={b.url}
                      toast={toast}
                      onUrl={(u) => set({ url: u, ...(u ? { icon: 'file' } : { icon: 'auto' }) })}
                      onFile={(f) => set({ ...(b.title ? {} : { title: f.name.replace(/\.[^.]+$/, '') }), ...(b.note ? {} : { note: f.size >= 1048576 ? `${(f.size / 1048576).toFixed(f.size >= 10485760 ? 0 : 1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB` }) })}
                    />
                    <Input placeholder="A line under it (optional)" value={b.note} maxLength={140} onChange={(e) => set({ note: e.target.value })} />
                    <IconPicker block={b} onChange={(id) => set({ icon: id })} />
                    <Switch checked={!!b.featured} onChange={(v) => set({ featured: v })} label="Feature this link" hint="Draws an outline round it so it stands out." />
                    <Row label="Ask for attention">
                      <Seg value={b.anim ?? 'none'} options={LINK_ANIMS} onChange={(v) => set({ anim: v })} />
                    </Row>
                    <div className="grid grid-cols-2 gap-2">
                      <Row label="Show from">
                        <Input type="datetime-local" aria-label="Show from" value={toLocal(b.from)} onChange={(e) => set({ from: fromLocal(e.target.value) })} className="px-2.5 text-[0.8rem] [color-scheme:dark]" />
                      </Row>
                      <Row label="Hide after">
                        <Input type="datetime-local" aria-label="Hide after" value={toLocal(b.until)} onChange={(e) => set({ until: fromLocal(e.target.value) })} className="px-2.5 text-[0.8rem] [color-scheme:dark]" />
                      </Row>
                    </div>
                  </>
                )}
                {b.t === 'social' && <SocialFields b={b} set={set} />}
                {b.t === 'music' && <MusicFields b={b} set={set} toast={toast} />}
                {b.t === 'image' && <ImageFields b={b} set={set} toast={toast} />}
                {b.t === 'tags' && <TagsFields b={b} set={set} />}
                {b.t === 'status' && <StatusFields b={b} set={set} />}
                {b.t === 'video' && (
                  <>
                    <Input placeholder="YouTube, Vimeo, TikTok or Spotify link" value={b.url} inputMode="url" autoCapitalize="off" spellCheck={false} onChange={(e) => set({ url: e.target.value })} onBlur={() => set({ url: cleanUrl(b.url) || b.url })} />
                    <Input placeholder="Caption (optional)" value={b.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
                    <p className="text-[0.74rem] text-[var(--ed-mute)]">{b.url ? (embedFor(cleanUrl(b.url)) ? 'this plays on the page.' : "this one can't play on the page, so it shows as a link.") : 'paste a link and it plays right on your page.'}</p>
                  </>
                )}
                {b.t === 'heading' && <Input placeholder="Heading" value={b.text} maxLength={80} onChange={(e) => set({ text: e.target.value })} />}
                {b.t === 'text' && <Area placeholder="Some words" value={b.text} maxLength={600} onChange={(e) => set({ text: e.target.value })} />}
                {b.t === 'divider' && <p className="text-[0.76rem] text-[var(--ed-mute)]">A thin line between two groups of links.</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  )
}

/** The schedule is stored as UTC; the date fields show and take the visitor's own clock. */
function toLocal(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`
}
function fromLocal(v: string) {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

function titleFor(url: string) {
  try {
    const h = new URL(cleanUrl(url)).hostname.replace(/^www\./, '').split('.')[0]
    return h ? h[0].toUpperCase() + h.slice(1) : ''
  } catch {
    return ''
  }
}

export function LinksPanel({ api }: { api: EditorApi }) {
  const { cfg, set, stats } = api
  const [open, setOpen] = useState<string | null>(null)
  const blocks = cfg.blocks
  const add = (t: BioBlock['t']) => {
    if (blocks.length >= MAX_BLOCKS) return api.toast(`A page holds up to ${MAX_BLOCKS} things.`)
    const b = blank(t)
    set((c) => ({ ...c, blocks: [...c.blocks, b] }))
    if (t !== 'divider') setOpen(b.id)
  }
  const [pasted, setPasted] = useState('')
  // the jump box can ask for a block to be added ("Add a song"): once the panel is up
  const addRef = useRef<(t: BioBlock['t']) => void>(() => undefined)
  useEffect(() => {
    const take = (t: string | null) => {
      if (t && KINDS.some((k) => k.t === t)) addRef.current(t as BioBlock['t'])
    }
    try {
      const pending = window.sessionStorage.getItem('ll:add')
      if (pending) {
        window.sessionStorage.removeItem('ll:add')
        take(pending)
      }
    } catch {
      /* nothing waiting */
    }
    const on = (e: Event) => {
      try {
        window.sessionStorage.removeItem('ll:add')
      } catch {
        /* nothing waiting */
      }
      take((e as CustomEvent<string>).detail)
    }
    window.addEventListener('ll:add', on)
    return () => window.removeEventListener('ll:add', on)
  }, [])
  const paste = (raw: string) => {
    const b = blockFromPaste(raw)
    if (!b) return api.toast('That is not a link we can use. Try one that starts with https.')
    if (blocks.length >= MAX_BLOCKS) return api.toast(`A page holds up to ${MAX_BLOCKS} things.`)
    set((c) => ({ ...c, blocks: [...c.blocks, b] }))
    setPasted('')
    setOpen(b.id)
    // a song's cover, title and artist are looked up for it
    if (b.t === 'music') {
      void lookUp(b.url).then((song) => {
        if (song) set((c) => ({ ...c, blocks: c.blocks.map((x) => (x.id === b.id && x.t === 'music' ? { ...x, title: song.title || x.title, artist: song.artist || undefined, album: song.album || undefined, cover: song.cover || undefined, preview: song.preview || undefined } : x)) }))
      })
    }
  }
  addRef.current = add
  const copy = (b: BioBlock) => {
    if (blocks.length >= MAX_BLOCKS) return api.toast(`A page holds up to ${MAX_BLOCKS} things.`)
    const dup = { ...b, id: newId() } as BioBlock
    set((c) => {
      const i = c.blocks.findIndex((x) => x.id === b.id)
      const next = [...c.blocks]
      next.splice(i + 1, 0, dup)
      return { ...c, blocks: next }
    })
    setOpen(dup.id)
  }
  const update = (id: string, p: Partial<BioBlock>) => set((c) => ({ ...c, blocks: c.blocks.map((x) => (x.id === id ? ({ ...x, ...p } as BioBlock) : x)) }))
  return (
    <div>
      <div className="border-b border-[var(--ed-line)] px-5 py-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            paste(pasted)
          }}
          className="mb-4"
        >
          <div className="flex h-11 items-center gap-2.5 rounded-xl border border-[var(--ed-line2)] bg-white/[0.03] px-3.5 transition-colors focus-within:border-white/45">
            <ClipboardPaste className="size-4 shrink-0 text-white/45" strokeWidth={1.6} />
            <input
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              onPaste={(e) => {
                const t = e.clipboardData.getData('text')
                if (cleanUrl(t)) {
                  e.preventDefault()
                  paste(t)
                }
              }}
              placeholder="Paste anything: a link, a profile, a song, a video"
              aria-label="Paste a link to add it"
              inputMode="url"
              autoCapitalize="off"
              spellCheck={false}
              className="h-full min-w-0 flex-1 bg-transparent text-[0.86rem] text-white outline-none placeholder:text-white/30"
            />
          </div>
        </form>
        <p className="mb-2.5 text-[0.76rem] text-[var(--ed-mute)]">Or add one yourself</p>
        <div className="grid grid-cols-5 gap-1.5">
          {KINDS.map((k) => (
            <button key={k.t} type="button" onClick={() => add(k.t)} title={k.name} className="group flex h-14 flex-col items-center justify-center gap-1 rounded-xl border border-[var(--ed-line)] text-[0.66rem] text-[var(--ed-mute)] transition-[background,color,border-color,transform] duration-200 hover:-translate-y-px hover:border-white/30 hover:bg-white/[0.05] hover:text-white">
              <k.icon className="size-[1.05rem]" strokeWidth={1.5} />
              {k.name}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 py-5">
        {blocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--ed-line2)] px-5 py-10 text-center">
            <Plus className="mx-auto mb-3 size-5 text-white/40" strokeWidth={1.5} />
            <p className="text-[0.88rem] text-white">nothing here yet</p>
            <p className="mx-auto mt-1 max-w-[16rem] text-[0.78rem] text-[var(--ed-mute)]">start with your best edit, your portfolio, or where people can book you.</p>
            <Btn variant="solid" className="mt-5" onClick={() => add('link')}>
              Add a link
            </Btn>
          </div>
        ) : (
          <Reorder.Group axis="y" values={blocks} onReorder={(next) => set((c) => ({ ...c, blocks: next }))} className="space-y-2">
            {blocks.map((b) => (
              <Item key={b.id} b={b} open={open === b.id} toggle={() => setOpen(open === b.id ? null : b.id)} update={(p) => update(b.id, p)} remove={() => set((c) => ({ ...c, blocks: c.blocks.filter((x) => x.id !== b.id) }))} duplicate={() => copy(b)} clicks={stats.links[b.id]}  toast={api.toast} />
            ))}
          </Reorder.Group>
        )}
        {blocks.length > 0 && <p className="mt-4 text-[0.74rem] text-[var(--ed-dim)]">Drag the handle to reorder. Socials sit together as a row of icons.</p>}
      </div>
    </div>
  )
}
