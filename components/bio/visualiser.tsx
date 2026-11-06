'use client'

import { type RefObject, useEffect, useRef } from 'react'
import type { BioConfig } from '@/lib/bio'

/** What the player hands over: the analyser at the end of the sound chain, and two buffers to read it into. */
export type Tap = { an: AnalyserNode; freq: Uint8Array<ArrayBuffer>; wave: Uint8Array<ArrayBuffer> }

type Vis = BioConfig['vis']
type Box = { x: number; y: number; w: number; h: number }

/**
 * The music, drawn. One canvas over the whole page (between the background and the content) that draws into the part of the page the owner picked:
 * a strip along the bottom or the top, a square in the middle, or the whole page. When there is no sound to read (the editor's preview before pressing
 * play) it draws a made-up signal, so the owner can see what they picked.
 */
export function Visualiser({ vis, tap, playing, demo, rootRef }: { vis: Vis; tap: RefObject<Tap | null>; playing: boolean; demo: boolean; rootRef: RefObject<HTMLElement | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef({ vals: new Float32Array(0), peaks: new Float32Array(0), raw: new Float32Array(0), ref: 0.3 })
  const visRef = useRef(vis)
  visRef.current = vis
  const live = useRef({ playing, demo })
  live.current = { playing, demo }

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let raf = 0
    let w = 0
    let h = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const fit = () => {
      const r = c.getBoundingClientRect()
      w = r.width
      h = r.height
      c.width = Math.max(1, Math.round(w * dpr))
      c.height = Math.max(1, Math.round(h * dpr))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(c)

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const v = visRef.current
      const n = v.bands
      const s = state.current
      if (s.vals.length !== n) {
        s.vals = new Float32Array(n)
        s.peaks = new Float32Array(n)
        s.raw = new Float32Array(n)
      }
      const t = now / 1000
      const { playing: on, demo: fake } = live.current
      const tp = tap.current
      let wave: ArrayLike<number> | null = null
      const k = v.sensitivity / 100
      if (tp && on) {
        tp.an.getByteFrequencyData(tp.freq)
        tp.an.getByteTimeDomainData(tp.wave)
        wave = tp.wave
        const usable = Math.floor(tp.freq.length * 0.72)
        let top = 0
        for (let i = 0; i < n; i++) {
          const lo = Math.floor(Math.pow(i / n, 1.7) * usable)
          const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / n, 1.7) * usable))
          let sum = 0
          for (let j = lo; j < hi; j++) sum += tp.freq[j]
          // the high end is quieter in every song: lift it a little so the right side moves too
          s.raw[i] = (sum / (hi - lo) / 255) * (0.85 + (i / n) * 0.5)
          if (s.raw[i] > top) top = s.raw[i]
        }
        // Automatic gain: everything is measured against the loudest the song has been lately (rising at once, falling slowly). A loud master no
        // longer pins every bar to the top, and a quiet one still fills the space. The floor keeps silence looking like silence.
        s.ref = Math.max(top, s.ref * 0.994, 0.12)
        const floor = s.ref * 0.18
        for (let i = 0; i < n; i++) {
          const v = Math.max(0, s.raw[i] - floor) / (s.ref - floor)
          s.vals[i] = Math.min(1, Math.pow(v, 1.25) * k * 0.95)
        }
      } else if (fake) {
        for (let i = 0; i < n; i++) {
          const x = i / n
          const beat = Math.pow(Math.max(0, Math.sin(t * 4.2)), 6) * 0.35
          const target = Math.max(0, (0.32 + 0.22 * Math.sin(t * 2.1 + i * 0.37) + 0.18 * Math.sin(t * 5.3 + i * 1.1) + beat) * (1 - x * 0.55)) * k
          s.vals[i] += (Math.min(1, target) - s.vals[i]) * 0.25
        }
      } else {
        for (let i = 0; i < n; i++) s.vals[i] *= 0.9
      }
      for (let i = 0; i < n; i++) s.peaks[i] = Math.max(s.vals[i], s.peaks[i] - 0.012)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const fg = (rootRef.current && getComputedStyle(rootRef.current).getPropertyValue('--bio-fg').trim()) || '#fff'
      ctx.fillStyle = fg
      ctx.strokeStyle = fg
      ctx.lineWidth = v.thickness
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowBlur = v.glow
      ctx.shadowColor = fg
      draw(ctx, v, region(v, w, h), s.vals, s.peaks, wave, t, fake && !(tp && on))
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [tap, rootRef])

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] size-full" style={{ opacity: vis.opacity / 100 }} />
}

function region(v: Vis, w: number, h: number): Box & { flip: boolean } {
  const f = v.height / 100
  switch (v.place) {
    case 'top':
      return { x: 0, y: 0, w, h: h * f * 0.8, flip: true }
    case 'centre': {
      const s = Math.min(w, h) * (0.25 + f * 0.75)
      return { x: (w - s) / 2, y: (h - s) / 2, w: s, h: s, flip: false }
    }
    case 'back':
      return { x: 0, y: 0, w, h, flip: false }
    default:
      return { x: 0, y: h - h * f * 0.8, w, h: h * f * 0.8, flip: false }
  }
}

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
  else ctx.rect(x, y, w, h)
  ctx.fill()
}

function draw(ctx: CanvasRenderingContext2D, v: Vis, b: Box & { flip: boolean }, vals: Float32Array, peaks: Float32Array, wave: ArrayLike<number> | null, t: number, fake: boolean) {
  const n = vals.length
  const centre = v.centre
  // where a column of height `len` starts, for the strip shapes
  const col = (len: number) => (centre ? b.y + (b.h - len) / 2 : b.flip ? b.y : b.y + b.h - len)
  switch (v.kind) {
    case 'bars':
    case 'mirror': {
      const bw = b.w / n
      const gap = Math.max(1, bw * 0.28)
      for (let i = 0; i < n; i++) {
        const idx = v.kind === 'mirror' ? Math.abs(i - (n - 1) / 2) * 2 : i
        const val = vals[Math.min(n - 1, Math.floor(idx))]
        const len = Math.max(2, val * b.h)
        const inMirror = v.kind === 'mirror'
        const y = inMirror ? b.y + (b.h - len) / 2 : col(len)
        rr(ctx, b.x + i * bw + gap / 2, y, bw - gap, len, (bw - gap) / 2)
      }
      return
    }
    case 'blocks': {
      const bw = b.w / n
      const gap = Math.max(1, bw * 0.22)
      const seg = Math.max(3, v.thickness * 2 + 2)
      const rows = Math.max(2, Math.floor(b.h / seg))
      for (let i = 0; i < n; i++) {
        const lit = Math.round(vals[i] * rows)
        for (let r = 0; r < lit; r++) {
          const y = centre ? b.y + b.h / 2 - ((lit * seg) / 2) + r * seg : b.flip ? b.y + r * seg : b.y + b.h - (r + 1) * seg
          ctx.globalAlpha = 0.45 + 0.55 * (r / rows)
          ctx.fillRect(b.x + i * bw + gap / 2, y + 1, bw - gap, seg - 2)
        }
        const pk = Math.round(peaks[i] * rows)
        if (pk > lit && !centre) {
          ctx.globalAlpha = 1
          const y = b.flip ? b.y + pk * seg : b.y + b.h - (pk + 1) * seg
          ctx.fillRect(b.x + i * bw + gap / 2, y + 1, bw - gap, seg - 2)
        }
      }
      ctx.globalAlpha = 1
      return
    }
    case 'dots': {
      const bw = b.w / n
      const r = Math.max(1, Math.min(bw * 0.32, v.thickness * 1.4))
      const step = r * 2.8
      const rows = Math.max(2, Math.floor(b.h / step))
      for (let i = 0; i < n; i++) {
        const lit = Math.max(1, Math.round(vals[i] * rows))
        const cx = b.x + i * bw + bw / 2
        for (let k = 0; k < lit; k++) {
          const cy = centre ? b.y + b.h / 2 + (k - (lit - 1) / 2) * step : b.flip ? b.y + r + k * step : b.y + b.h - r - k * step
          ctx.globalAlpha = 1 - (k / rows) * 0.6
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      return
    }
    case 'wave': {
      const mid = b.y + b.h / 2
      const pts = 128
      // the waveform is scaled to its own loudest point, so a loud song fills the strip instead of clipping out of it
      let dev = 0.1
      if (wave && !fake) for (let i = 0; i < wave.length; i += 4) dev = Math.max(dev, Math.abs(wave[i] - 128) / 128)
      ctx.beginPath()
      for (let i = 0; i <= pts; i++) {
        const x = b.x + (i / pts) * b.w
        let y: number
        if (wave && !fake) {
          const idx = Math.floor((i / pts) * (wave.length - 1))
          y = mid + Math.max(-1, Math.min(1, (((wave[idx] - 128) / 128) / dev) * 0.9 * (v.sensitivity / 100))) * b.h * 0.5
        } else {
          const amp = vals[Math.floor((i / pts) * (n - 1))] * b.h * 0.45
          y = mid + Math.sin(i * 0.38 + t * 6) * amp * Math.sin((i / pts) * Math.PI)
        }
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      return
    }
    case 'line':
    case 'spectrum': {
      const y = (i: number) => {
        const len = vals[i] * b.h
        return centre ? b.y + b.h / 2 - len / 2 : b.flip ? b.y + len : b.y + b.h - len
      }
      const x = (i: number) => b.x + (i / (n - 1)) * b.w
      ctx.beginPath()
      ctx.moveTo(x(0), y(0))
      for (let i = 1; i < n; i++) {
        const mx = (x(i - 1) + x(i)) / 2
        ctx.quadraticCurveTo(x(i - 1), y(i - 1), mx, (y(i - 1) + y(i)) / 2)
      }
      ctx.lineTo(x(n - 1), y(n - 1))
      if (v.kind === 'spectrum') {
        const base = centre ? b.y + b.h / 2 : b.flip ? b.y : b.y + b.h
        ctx.lineTo(b.x + b.w, base)
        ctx.lineTo(b.x, base)
        ctx.closePath()
        ctx.globalAlpha = 0.35
        ctx.fill()
        ctx.globalAlpha = 1
      }
      ctx.stroke()
      if (centre) {
        // the reflection under the middle line
        ctx.globalAlpha = 0.35
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const yy = b.y + b.h / 2 + (vals[i] * b.h) / 2
          if (i === 0) ctx.moveTo(x(i), yy)
          else ctx.lineTo(x(i), yy)
        }
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      return
    }
    case 'circle':
    case 'burst': {
      const cx = b.x + b.w / 2
      const cy = b.y + b.h / 2
      const m = Math.min(b.w, b.h)
      const r0 = m * 0.22
      if (v.kind === 'circle') {
        ctx.globalAlpha = 0.4
        ctx.beginPath()
        ctx.arc(cx, cy, r0 - v.thickness * 2, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
        for (let i = 0; i < n * 2; i++) {
          const val = vals[i < n ? i : 2 * n - 1 - i]
          const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
          const len = 2 + val * m * 0.26
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
          ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len))
          ctx.stroke()
        }
      } else {
        const pts = n * 2
        ctx.beginPath()
        for (let i = 0; i <= pts; i++) {
          const val = vals[(i % pts) < n ? i % pts : pts - 1 - (i % pts)]
          const a = (i / pts) * Math.PI * 2 - Math.PI / 2 + t * 0.15
          const r = r0 * 0.8 + val * m * 0.3
          const px = cx + Math.cos(a) * r
          const py = cy + Math.sin(a) * r
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.globalAlpha = 0.18
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.stroke()
      }
      return
    }
    case 'rings': {
      const cx = b.x + b.w / 2
      const cy = b.y + b.h / 2
      const m = Math.min(b.w, b.h)
      const count = 6
      const per = Math.max(1, Math.floor(n / count))
      for (let k = 0; k < count; k++) {
        let s = 0
        for (let j = 0; j < per; j++) s += vals[Math.min(n - 1, k * per + j)]
        const val = s / per
        const r = m * 0.08 + (k / count) * m * 0.36 + val * m * 0.06
        ctx.globalAlpha = 0.25 + val * 0.75
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      return
    }
    default:
      return
  }
}
