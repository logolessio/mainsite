'use client'

import { CURSOR_TRAILS, ENTER_SCREENS, OVERLAYS, REVEALS, isMediaUrl } from '@/lib/bio'
import { CURSORS, cursorSvg } from '@/lib/bio-cursors'
import { uploadAudio, uploadCursor } from '@/lib/image-client'
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
      <Group title="Trail" hint="what trails the pointer. only on screens with a mouse.">
        <div className="grid grid-cols-3 gap-1.5">
          {CURSOR_TRAILS.map((t) => (
            <button key={t.id} type="button" onClick={() => up('cursor', { trail: t.id })} aria-pressed={c.trail === t.id} className={cn('h-9 rounded-lg border text-[0.76rem] transition-colors', c.trail === t.id ? 'border-white bg-white text-black' : 'border-[var(--ed-line)] text-[var(--ed-mute)] hover:text-white')}>
              {t.name}
            </button>
          ))}
        </div>
      </Group>
    </div>
  )
}

export function EffectsPanel({ api }: { api: EditorApi }) {
  const { cfg, up, toast } = api
  const fx = cfg.fx
  const au = cfg.audio
  return (
    <div>
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
      <Group title="Music" hint="Plays when someone enters the page. Upload a short file, or paste a link to a whole song.">
        <MediaField
          value={au.id}
          kinds={['audio']}
          accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav"
          uploadLabel="Upload music"
          upload={async (f) => {
            const id = await uploadAudio(f)
            up('audio', { title: au.title || f.name.replace(/\.[^.]+$/, '').slice(0, 60) })
            return id
          }}
          onChange={(v) => up('audio', { id: v, ...(v ? {} : { title: '' }) })}
          toast={toast}
          hint="Uploads are kept to 1 MB, about a minute of MP3. For a full song, host it anywhere and paste the link."
        />
        {au.id && (
          <>
            <Input value={au.title} placeholder="What it is called" maxLength={60} onChange={(e) => up('audio', { title: e.target.value })} />
            <Row label="Volume" value={au.volume}>
              <Slider label="Volume" value={au.volume} onChange={(v) => up('audio', { volume: v })} />
            </Row>
            <Switch checked={au.loop} onChange={(v) => up('audio', { loop: v })} label="Loop" />
            {!isMediaUrl(au.id) && <Switch checked={au.reactive} onChange={(v) => up('audio', { reactive: v })} label="The page reacts to it" hint="Your picture pulses with the sound." />}
          </>
        )}
      </Group>
      <Group title="Enter screen" hint="a screen in front of your page until someone clicks. browsers need that click before music can play.">
        <Seg value={fx.enter} options={ENTER_SCREENS} cols={2} onChange={(v) => up('fx', { enter: v })} />
        {fx.enter !== 'none' && <Input value={fx.enterText} maxLength={40} placeholder="click to enter" onChange={(e) => up('fx', { enterText: e.target.value })} />}
      </Group>
      <Group title="Arriving">
        <Seg value={fx.reveal} options={REVEALS} onChange={(v) => up('fx', { reveal: v })} />
        <Switch checked={fx.typewriter} onChange={(v) => up('fx', { typewriter: v })} label="Type out the bio" />
      </Group>
      <Group title="Movement">
        <Switch checked={fx.magnetic} onChange={(v) => up('fx', { magnetic: v })} label="Pull towards the pointer" />
        <Switch checked={fx.spotlight} onChange={(v) => up('fx', { spotlight: v })} label="Spotlight" hint="Everything dims except where the pointer is." />
        <Row label="Parallax" value={fx.parallax}>
          <Slider label="Parallax" value={fx.parallax} onChange={(v) => up('fx', { parallax: v })} />
        </Row>
      </Group>
      <Group title="Film">
        <Row label="Grain" value={fx.grain}>
          <Slider label="Grain" value={fx.grain} onChange={(v) => up('fx', { grain: v })} />
        </Row>
        <Row label="Scan lines" value={fx.scanlines}>
          <Slider label="Scan lines" value={fx.scanlines} onChange={(v) => up('fx', { scanlines: v })} />
        </Row>
      </Group>
    </div>
  )
}
