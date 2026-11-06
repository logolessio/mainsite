'use client'

import { AlignCenter, AlignLeft, AlignRight, ArrowDownToLine, ArrowUpToLine, MoveHorizontal, RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import { type BioBlock, FREE_W, type FreeBox, linkLabel, resolveFree } from '@/lib/bio'
import { LINK_PLATFORMS } from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import type { EditorApi } from './types'
import { Btn, Group, Row, Slider, Switch } from './ui'

const label = (key: string, b?: BioBlock) => {
  if (key === 'card') return 'Card'
  if (key === 'avatar') return 'Picture'
  if (key === 'name') return 'Name'
  if (key === 'bio') return 'Bio'
  if (!b) return key
  switch (b.t) {
    case 'link':
      return linkLabel(b) || b.url.replace(/^https?:\/\/(www\.)?/, '') || 'Link'
    case 'social':
      return LINK_PLATFORMS.find((p) => p.id === b.platform)?.label ?? b.platform
    case 'video':
      return b.title || 'Video'
    case 'heading':
      return b.text || 'Heading'
    case 'text':
      return b.text.slice(0, 22) || 'Text'
    default:
      return 'Divider'
  }
}

const textual = (key: string, b?: BioBlock) => key === 'name' || key === 'bio' || b?.t === 'heading' || b?.t === 'text'

/** Where everything sits on the canvas layout, as numbers and buttons. The same things can be dragged on the preview. */
export function ArrangePanel({ api }: { api: EditorApi }) {
  const { cfg, set, profile, sel, setSel, snap, setSnap } = api
  const boxes = useMemo(() => resolveFree(cfg, { bare: Boolean(api.page), name: profile.name || 'Your name', bio: profile.bio, badges: cfg.meta.badges ? 1 : 0 }), [cfg, profile.name, profile.bio, api.page])
  const blocks = new Map(cfg.blocks.map((b) => [b.id, b]))
  const keys = Object.keys(boxes)
  const cur = sel && boxes[sel] ? sel : null
  const box = cur ? boxes[cur] : null
  const block = cur ? blocks.get(cur) : undefined

  const put = (patch: Partial<FreeBox>) => {
    if (!cur || !box) return
    const next: FreeBox = { ...box, ...patch }
    if (!next.r) delete next.r
    if (!next.z) delete next.z
    if (next.f === 1) delete next.f
    set((c) => ({ ...c, free: { ...(c.free ?? {}), [cur]: next } }))
  }
  const reset = (k?: string) =>
    set((c) => {
      if (!k) return { ...c, free: undefined }
      const rest = { ...(c.free ?? {}) }
      delete rest[k]
      return { ...c, free: Object.keys(rest).length ? rest : undefined }
    })

  return (
    <>
      <Group title="Arrange" hint="Drag anything on the preview. Pull the side handles to resize and the dot above to turn it. Arrow keys nudge it, and Shift makes the step bigger. Hold Alt to drag without snapping.">
        <Switch checked={snap} onChange={setSnap} label="Snap to other things" hint="Lines up with the middle of the page and the edges of everything else." />
        <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Everything on the page">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              role="option"
              aria-selected={cur === k}
              onClick={() => setSel(cur === k ? null : k)}
              className={cn('h-8 max-w-full truncate rounded-full border px-3 text-[0.74rem] transition-colors duration-200', cur === k ? 'border-transparent bg-[#ececec] text-[#0a0a0a]' : 'border-[var(--ed-line2)] text-white/70 hover:border-white/30 hover:text-white')}
            >
              {label(k, blocks.get(k))}
            </button>
          ))}
        </div>
      </Group>
      {cur && box && (
        <Group title={label(cur, block)}>
          <Row label="Across" value={Math.round(box.x)}>
            <Slider label="Across" value={Math.round(box.x)} min={-100} max={FREE_W + 60} onChange={(v) => put({ x: v })} />
          </Row>
          <Row label="Down" value={Math.round(box.y)}>
            <Slider label="Down" value={Math.round(box.y)} min={0} max={1600} onChange={(v) => put({ y: v })} />
          </Row>
          <Row label="Width" value={Math.round(box.w)}>
            <Slider label="Width" value={Math.round(box.w)} min={24} max={FREE_W + 60} onChange={(v) => put({ w: v })} />
          </Row>
          {cur === 'card' && (
            <Row label="Height" value={Math.round(box.h ?? 0)}>
              <Slider label="Height" value={Math.round(box.h ?? 200)} min={60} max={1600} onChange={(v) => put({ h: v })} />
            </Row>
          )}
          <Row label="Turn" value={`${Math.round(box.r ?? 0)}°`}>
            <Slider label="Turn" value={Math.round(box.r ?? 0)} min={-180} max={180} onChange={(v) => put({ r: v })} />
          </Row>
          {textual(cur, block) && (
            <>
              <Row label="Text size" value={`${Math.round((box.f ?? 1) * 100)}%`}>
                <Slider label="Text size" value={Math.round((box.f ?? 1) * 100)} min={40} max={300} onChange={(v) => put({ f: v / 100 })} />
              </Row>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--ed-line)] bg-white/[0.02] p-1" role="radiogroup" aria-label="Text alignment">
                {([['l', AlignLeft, 'Left'], ['c', AlignCenter, 'Centre'], ['r', AlignRight, 'Right']] as const).map(([id, Icon, name]) => {
                  const on = (box.a ?? (cfg.theme.align === 'left' ? 'l' : 'c')) === id
                  return (
                    <button key={id} type="button" role="radio" aria-checked={on} aria-label={name} onClick={() => put({ a: id })} className={cn('grid h-8 place-items-center rounded-lg transition-colors duration-200', on ? 'bg-[#ececec] text-[#0a0a0a]' : 'text-[var(--ed-mute)] hover:text-white')}>
                      <Icon className="size-4" />
                    </button>
                  )
                })}
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => put({ x: Math.round((FREE_W - box.w) / 2) })}>
              <MoveHorizontal className="size-3.5" /> Centre
            </Btn>
            <Btn onClick={() => put({ z: Math.min(99, (box.z ?? 0) + 1) })} aria-label="Bring forward">
              <ArrowUpToLine className="size-3.5" /> Forward
            </Btn>
            <Btn onClick={() => put({ z: Math.max(0, (box.z ?? 0) - 1) })} aria-label="Send back">
              <ArrowDownToLine className="size-3.5" /> Back
            </Btn>
            <Btn variant="quiet" onClick={() => reset(cur)}>
              <RotateCcw className="size-3.5" /> Reset
            </Btn>
          </div>
        </Group>
      )}
      {cfg.free && (
        <Group>
          <Btn variant="quiet" onClick={() => reset()}>
            <RotateCcw className="size-3.5" /> Put everything back where it started
          </Btn>
        </Group>
      )}
    </>
  )
}
