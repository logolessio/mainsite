'use client'

import { CLICK_EFFECTS, CURSOR_TRAILS, ENTER_SCREENS, OVERLAYS, REVEALS } from '@/lib/bio'
import { CURSORS, cursorSvg } from '@/lib/bio-cursors'
import { uploadCursor } from '@/lib/image-client'
import { cn } from '@/lib/utils'
import { EffectTile } from './look-tile'
import { MediaField } from './media-field'
import type { EditorApi } from './types'
import { Group, Input, Row, Seg, Slider, Switch } from './ui'

const svgUrl = (id: string, ink: 'white' | 'black', which: 'arrow' | 'link') => {
  const p = CURSORS.find((c) => c.id === id)!
  return `data:image/svg+xml,${encodeURIComponent(cursorSvg(p[which], ink, 32))}`
}

export function CursorPanel({ api }: { api: EditorApi }) {
  const { cfg, up, toast } = api
  const c = cfg.cursor
  return (
    <div>
      <Group title="Cursor" hint="What the pointer looks like on your page. Move over the preview to try it.">
        <Seg value={c.kind} options={[{ id: 'default', name: 'Normal' }, { id: 'preset', name: 'Ours' }, { id: 'upload', name: 'Yours' }]} onChange={(v) => up('cursor', { kind: v })} />
        {c.kind === 'preset' && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {CURSORS.map((p) => (
                <button key={p.id} type="button" onClick={() => up('cursor', { preset: p.id })} aria-pressed={c.preset === p.id} title={p.name} className={cn('group relative grid aspect-square place-items-center rounded-xl border transition-colors', c.preset === p.id ? 'border-white' : 'border-[var(--ed-line)] hover:border-white/40')} style={{ background: c.ink === 'white' ? '#161616' : '#e9e9e9' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={svgUrl(p.id, c.ink, 'arrow')} alt={p.name} width={28} height={28} className="transition-opacity group-hover:opacity-0" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={svgUrl(p.id, c.ink, 'link')} alt="" width={28} height={28} className="absolute opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
            <p className="text-[0.74rem] text-[var(--ed-mute)]">Each has a second shape that appears over links. Hover a tile to see it.</p>
            <Row label="Colour">
              <Seg value={c.ink} options={[{ id: 'white', name: 'White' }, { id: 'black', name: 'Black' }]} onChange={(v) => up('cursor', { ink: v })} />
            </Row>
            <Row label="Size" value={`${c.size}px`}>
              <Slider label="Cursor size" min={20} max={64} value={c.size} onChange={(v) => up('cursor', { size: v })} />
            </Row>
          </>
        )}
        {c.kind === 'upload' && (
          <div className="space-y-3">
            <MediaField value={c.image} kinds={['image']} accept="image/png,image/webp,image/jpeg,image/svg+xml,image/gif" uploadLabel="Upload a picture or SVG" upload={uploadCursor} onChange={(v) => up('cursor', { image: v, kind: v ? 'upload' : 'default' })} toast={toast} hint="Any picture works. Browsers draw a cursor at up to 128 px, so use a small one with a transparent background." />
            <Row label="The point of it is the">
              <Seg value={c.hot} options={[{ id: 'tl', name: 'Top left' }, { id: 'center', name: 'Centre' }]} onChange={(v) => up('cursor', { hot: v })} />
            </Row>
          </div>
        )}
      </Group>
      <Group title="Trail" hint="What follows the pointer. Only on screens with a mouse.">
        <div className="grid grid-cols-4 gap-1.5">
          {CURSOR_TRAILS.map((t) => (
            <button key={t.id} type="button" onClick={() => up('cursor', { trail: t.id })} aria-pressed={c.trail === t.id} className={cn('h-9 rounded-lg border px-1 text-[0.74rem] transition-colors', c.trail === t.id ? 'border-white bg-white text-black' : 'border-[var(--ed-line)] text-[var(--ed-mute)] hover:border-white/30 hover:text-white')}>
              {t.name}
            </button>
          ))}
        </div>
      </Group>
      <Group title="On click" hint="What happens where the page is pressed. Works on phones too.">
        <div className="grid grid-cols-4 gap-1.5">
          {CLICK_EFFECTS.map((t) => (
            <button key={t.id} type="button" onClick={() => up('cursor', { click: t.id })} aria-pressed={c.click === t.id} className={cn('h-9 rounded-lg border px-1 text-[0.74rem] transition-colors', c.click === t.id ? 'border-white bg-white text-black' : 'border-[var(--ed-line)] text-[var(--ed-mute)] hover:border-white/30 hover:text-white')}>
              {t.name}
            </button>
          ))}
        </div>
      </Group>
      {(c.trail !== 'none' || c.click !== 'none') && (
        <Group fold title="Look of the effects" hint="Move over the preview to try them.">
          <Row label="Colour">
            <Seg value={c.color} options={[{ id: 'auto', name: 'Plain' }, { id: 'accent', name: 'Page colours' }, { id: 'rainbow', name: 'Rainbow' }]} onChange={(v) => up('cursor', { color: v })} />
          </Row>
          <Row label="Amount" value={`${c.amount}%`}>
            <Slider label="Amount" min={30} max={220} value={c.amount} onChange={(v) => up('cursor', { amount: v })} />
          </Row>
          {(c.trail === 'emoji' || c.click === 'emoji') && (
            <Row label="Emoji">
              <Input value={c.emoji} maxLength={8} aria-label="Emoji" onChange={(e) => up('cursor', { emoji: e.target.value })} className="w-24 text-center text-[1.1rem]" />
            </Row>
          )}
        </Group>
      )}
    </div>
  )
}

/** The effect that plays over the background (snow, embers, smoke ...). */
export function EffectsGroup({ api }: { api: EditorApi }) {
  const { cfg, up } = api
  return (
    <>
      <Group title="Effects" hint="Snow, embers, smoke and more, playing over your background. Pick one, then set how much and how fast.">
        <div className="grid grid-cols-4 gap-2">
          {OVERLAYS.map((o) => (
            <EffectTile key={o.id} id={o.id} name={o.name} on={cfg.overlay.effect === o.id} onClick={() => up('overlay', { effect: o.id })} />
          ))}
        </div>
        {cfg.overlay.effect !== 'none' && (
          <>
            <Row label="Amount" value={cfg.overlay.intensity}>
              <Slider label="Effect amount" value={cfg.overlay.intensity} onChange={(v) => up('overlay', { intensity: v })} />
            </Row>
            <Row label="Speed" value={cfg.overlay.speed}>
              <Slider label="Effect speed" value={cfg.overlay.speed} onChange={(v) => up('overlay', { speed: v })} />
            </Row>
          </>
        )}
      </Group>
    </>
  )
}

/** The enter screen, how the page arrives, and how it moves. */
export function ScreenGroups({ api }: { api: EditorApi }) {
  const { cfg, up } = api
  const fx = cfg.fx
  return (
    <>
      <Group fold title="Enter screen" hint="a screen in front of your page until someone clicks. browsers need that click before music can play.">
        <Seg value={fx.enter} options={ENTER_SCREENS} cols={2} onChange={(v) => up('fx', { enter: v })} />
        {fx.enter !== 'none' && <Input value={fx.enterText} maxLength={40} placeholder="click to enter" onChange={(e) => up('fx', { enterText: e.target.value })} />}
      </Group>
      <Group fold title="Arriving">
        <Seg value={fx.reveal} options={REVEALS} onChange={(v) => up('fx', { reveal: v })} />
        <Switch checked={fx.typewriter} onChange={(v) => up('fx', { typewriter: v })} label="Type out the bio" />
      </Group>
      <Group fold title="Movement">
        <Switch checked={fx.magnetic} onChange={(v) => up('fx', { magnetic: v })} label="Pull towards the pointer" />
        <Switch checked={fx.spotlight} onChange={(v) => up('fx', { spotlight: v })} label="Spotlight" hint="Everything dims except where the pointer is." />
        <Row label="Parallax" value={fx.parallax}>
          <Slider label="Parallax" value={fx.parallax} onChange={(v) => up('fx', { parallax: v })} />
        </Row>
      </Group>
      <Group fold title="Film">
        <Row label="Grain" value={fx.grain}>
          <Slider label="Grain" value={fx.grain} onChange={(v) => up('fx', { grain: v })} />
        </Row>
        <Row label="Scan lines" value={fx.scanlines}>
          <Slider label="Scan lines" value={fx.scanlines} onChange={(v) => up('fx', { scanlines: v })} />
        </Row>
      </Group>
    </>
  )
}
