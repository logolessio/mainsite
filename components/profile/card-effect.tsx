'use client'

import { useEffect, useRef } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import type { CardEffect } from '@/lib/profile-style'

/**
 * Effects for a profile card. Each one is a small simulation drawn on a canvas. They are built from crisp, physically
 * motivated pieces (streaking sparks, flame tongues, faceted glitter that only flashes when it catches the light, 3D
 * tumbling paper) instead of blurry glow blobs. `intensity` and `speed` are 0 to 100 and are read live.
 */

type Rgb = [number, number, number]
const TAU = Math.PI * 2
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const rgb = (hex: string): Rgb => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255]
}
const rgba = (c: Rgb, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a)})`
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const lift = (c: Rgb, t: number): Rgb => mix(c, [255, 255, 255], t)
const shade = (c: Rgb, t: number): Rgb => mix(c, [0, 0, 0], t)
/** A colour is "plain" when it is white or grey, which is the default. Effects then use their own natural colours. */
const plain = (c: Rgb) => Math.max(...c) - Math.min(...c) < 36

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}
/** Smooth 1D value noise, 0 to 1. */
const vnoise = (x: number) => {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  return hash(i) * (1 - u) + hash(i + 1) * u
}

type Opts = { w: number; h: number; n: number; speed: number; a: Rgb; b: Rgb }
type Sim = (ctx: CanvasRenderingContext2D, dt: number, t: number) => void

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
}

/** Dense scale used by every effect so the intensity slider means roughly the same thing everywhere. */
const power = (n: number) => clamp(n / 30, 0.15, 2)

// ============================================================================================================
// snow: three depth layers. Far flakes are sharp pin-pricks, mid flakes are small soft discs, near flakes are
// big out-of-focus crystals that slowly turn.
// ============================================================================================================
function crystal(size: number, blur: number) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')!
  const c = size / 2
  g.translate(c, c)
  g.strokeStyle = '#fff'
  g.lineCap = 'round'
  g.shadowColor = '#fff'
  g.shadowBlur = blur
  g.lineWidth = Math.max(1, size / 22)
  const R = size * 0.34
  for (let i = 0; i < 6; i++) {
    g.save()
    g.rotate((i * TAU) / 6)
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(0, -R)
    for (const [p, l] of [[0.45, 0.34], [0.7, 0.24]] as const) {
      g.moveTo(0, -R * p)
      g.lineTo(R * l * 0.9, -R * (p + l * 0.7))
      g.moveTo(0, -R * p)
      g.lineTo(-R * l * 0.9, -R * (p + l * 0.7))
    }
    g.stroke()
    g.restore()
  }
  return cv
}

function snow({ w, h, n, speed }: Opts): Sim {
  const sharp = crystal(64, 0)
  const soft = crystal(96, 9)
  const k = power(n)
  type F = { x: number; y: number; z: number; ph: number; f: number; rot: number; vr: number; r: number }
  const make = (z: number): F => ({ x: rand(0, w), y: rand(-h, h), z, ph: rand(0, TAU), f: rand(0.5, 1.2), rot: rand(0, TAU), vr: rand(-0.8, 0.8), r: 0 })
  const far = Array.from({ length: Math.round(70 * k) }, () => ({ ...make(0), r: rand(0.5, 1) }))
  const mid = Array.from({ length: Math.round(34 * k) }, () => ({ ...make(1), r: rand(1.3, 2.4) }))
  const near = Array.from({ length: Math.max(2, Math.round(7 * k)) }, () => ({ ...make(2), r: rand(8, 15) }))
  return (ctx, dt, t) => {
    const gust = Math.sin(t * 0.17) * 14 + Math.sin(t * 0.51) * 6
    const step = (f: F, fall: number, drift: number, wob: number) => {
      f.y += fall * speed * dt
      f.x += (gust * drift + Math.sin(t * f.f + f.ph) * wob) * speed * dt
      f.rot += f.vr * dt
      if (f.y > h + 20) {
        f.y = -20
        f.x = rand(0, w)
      }
      if (f.x > w + 20) f.x = -20
      if (f.x < -20) f.x = w + 20
    }
    ctx.fillStyle = '#fff'
    for (const f of far) {
      step(f, 14, 0.3, 3)
      ctx.globalAlpha = 0.4
      dot(ctx, f.x, f.y, f.r)
    }
    for (const f of mid) {
      step(f, 34, 0.7, 9)
      ctx.globalAlpha = 0.72
      dot(ctx, f.x, f.y, f.r)
      ctx.globalAlpha = 0.18
      dot(ctx, f.x, f.y, f.r * 2)
    }
    for (const f of near) {
      step(f, 62, 1.1, 18)
      ctx.save()
      ctx.translate(f.x, f.y)
      ctx.rotate(f.rot)
      ctx.globalAlpha = f.r > 11 ? 0.34 : 0.55
      const img = f.r > 11 ? soft : sharp
      ctx.drawImage(img, -f.r * 1.6, -f.r * 1.6, f.r * 3.2, f.r * 3.2)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }
}

// ============================================================================================================
// rain: angled streaks in two depths, drops that shatter into droplets on the ground, expanding rings.
// ============================================================================================================
function rain({ w, h, n, speed }: Opts): Sim {
  const ground = h - 6
  const k = power(n)
  const drops = Array.from({ length: Math.round(95 * k) }, () => ({ x: rand(-30, w), y: rand(-h, h), z: Math.pow(Math.random(), 1.3), gy: rand(h - 44, ground) }))
  const rings: { x: number; y: number; r: number; max: number; z: number }[] = []
  const bits: { x: number; y: number; vx: number; vy: number; life: number; age: number }[] = []
  let flash = 0
  let nextFlash = rand(10, 22)
  return (ctx, dt, t) => {
    const ang = 0.2 + Math.sin(t * 0.2) * 0.04
    const sx = Math.sin(ang)
    const cy = Math.cos(ang)
    ctx.lineCap = 'round'
    for (const d of drops) {
      const v = (560 + d.z * 520) * speed
      const len = 8 + d.z * 22
      d.x += sx * v * dt
      d.y += cy * v * dt
      if (d.y > d.gy) {
        if (rings.length < 40 && Math.random() < 0.7) rings.push({ x: d.x, y: d.gy, r: 0.5, max: 5 + d.z * 12, z: d.z })
        if (bits.length < 120 && d.z > 0.35)
          for (let i = 0; i < 3; i++) bits.push({ x: d.x, y: d.gy, vx: rand(-34, 34) + sx * 40, vy: -rand(26, 78), life: rand(0.25, 0.5), age: 0 })
        d.y = rand(-60, -4)
        d.x = rand(-20, w)
        d.gy = rand(h - 44, ground)
      }
      ctx.strokeStyle = `rgba(196,218,255,${0.12 + d.z * 0.5})`
      ctx.lineWidth = 0.5 + d.z * 0.9
      ctx.beginPath()
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x - sx * len, d.y - cy * len)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(214,230,255,0.7)'
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i]
      b.age += dt
      if (b.age > b.life) {
        bits.splice(i, 1)
        continue
      }
      b.vy += 420 * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      ctx.globalAlpha = 1 - b.age / b.life
      dot(ctx, b.x, b.y, 0.9)
    }
    ctx.globalAlpha = 1
    for (let i = rings.length - 1; i >= 0; i--) {
      const p = rings[i]
      p.r += (22 + p.max) * speed * dt
      const q = p.r / p.max
      if (q >= 1) {
        rings.splice(i, 1)
        continue
      }
      ctx.strokeStyle = `rgba(206,226,255,${(1 - q) * (0.16 + p.z * 0.4)})`
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.3, 0, 0, TAU)
      ctx.stroke()
    }
    nextFlash -= dt
    if (nextFlash < 0) {
      flash = 1
      nextFlash = rand(12, 26)
    }
    if (flash > 0) {
      ctx.fillStyle = `rgba(226,236,255,${flash * 0.08 * (0.55 + 0.45 * Math.sin(t * 70))})`
      ctx.fillRect(0, 0, w, h)
      flash -= dt * 4.5
    }
  }
}

// ============================================================================================================
// embers: sparks that streak upward on the heat, cooling from white to orange to dull red and guttering out,
// plus slow grey ash that is lit from below.
// ============================================================================================================
const HEAT: Rgb[] = [
  [255, 252, 230],
  [255, 214, 110],
  [255, 138, 36],
  [218, 58, 14],
  [96, 22, 10],
]
const heat = (k: number): Rgb => {
  const x = clamp(k) * (HEAT.length - 1)
  const i = Math.min(HEAT.length - 2, Math.floor(x))
  return mix(HEAT[i], HEAT[i + 1], x - i)
}

function embers({ w, h, n, speed }: Opts): Sim {
  const k = power(n)
  type S = { x: number; y: number; vx: number; vy: number; age: number; life: number; r: number; seed: number }
  const sparks: S[] = []
  type A = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; s: number; age: number; life: number }
  const ash: A[] = []
  let spawnAcc = 0
  let ashAcc = 0

  return (ctx, dt, t) => {
    ctx.globalCompositeOperation = 'lighter'
    spawnAcc += dt * 30 * k
    while (spawnAcc > 1) {
      spawnAcc -= 1
      if (sparks.length > 200) break
      sparks.push({ x: rand(w * 0.02, w * 0.98), y: h + rand(0, 10), vx: rand(-16, 16), vy: -rand(90, 240), age: 0, life: rand(1.6, 4), r: rand(0.9, 2.3), seed: rand(0, 100) })
    }
    ctx.lineCap = 'round'
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]
      s.age += dt
      if (s.age > s.life || s.y < -10) {
        sparks.splice(i, 1)
        continue
      }
      const q = s.age / s.life
      s.vx += (Math.sin(t * 2.3 + s.seed * 7 + s.y * 0.02) + Math.sin(t * 4.1 + s.seed * 3)) * 42 * dt
      s.vy *= 1 - 0.28 * dt
      s.vy -= 8 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      const c = heat(Math.pow(q, 0.8))
      const alive = hash(Math.floor(t * 18) + s.seed) > q * 0.55 // sparks gutter out as they cool
      const a = (1 - q * q) * (alive ? 1 : 0.15)
      const len = Math.hypot(s.vx, s.vy) * 0.045
      const nx = -s.vx / (Math.hypot(s.vx, s.vy) || 1)
      const ny = -s.vy / (Math.hypot(s.vx, s.vy) || 1)
      const tail = ctx.createLinearGradient(s.x, s.y, s.x + nx * len, s.y + ny * len)
      tail.addColorStop(0, rgba(c, a))
      tail.addColorStop(1, rgba(c, 0))
      ctx.strokeStyle = tail
      ctx.lineWidth = s.r * (1 - q * 0.45)
      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(s.x + nx * len, s.y + ny * len)
      ctx.stroke()
      ctx.fillStyle = rgba(lift(c, 0.35), a)
      dot(ctx, s.x, s.y, s.r * 0.6 * (1 - q * 0.4))
    }

    ctx.globalCompositeOperation = 'source-over'
    ashAcc += dt * 1.6 * k
    while (ashAcc > 1) {
      ashAcc -= 1
      if (ash.length < 26) ash.push({ x: rand(0, w), y: h + 6, vx: rand(-6, 6), vy: -rand(14, 34), rot: rand(0, TAU), vr: rand(-2, 2), s: rand(1.2, 2.8), age: 0, life: rand(4, 8) })
    }
    for (let i = ash.length - 1; i >= 0; i--) {
      const f = ash[i]
      f.age += dt
      if (f.age > f.life) {
        ash.splice(i, 1)
        continue
      }
      f.x += (f.vx + Math.sin(t * 1.3 + i) * 9) * dt
      f.y += f.vy * dt
      f.rot += f.vr * dt
      const q = f.age / f.life
      const glow = clamp(1 - (h - f.y) / (h * 0.3)) // lit from below by the fire
      ctx.save()
      ctx.translate(f.x, f.y)
      ctx.rotate(f.rot)
      ctx.fillStyle = rgba(mix([86, 78, 74], [255, 120, 50], glow * 0.7), (1 - q) * 0.5)
      ctx.fillRect(-f.s, -f.s * 0.5, f.s * 2, f.s)
      ctx.restore()
    }
  }
}

// ============================================================================================================
// glitter: hundreds of tiny flat facets. Each one only shines when its angle matches the light, and a slow
// band of light sweeps across, so glints travel in waves exactly like real glitter does.
// ============================================================================================================
function sparkle({ w, h, n, speed, a, b }: Opts): Sim {
  const k = power(n)
  const tints: Rgb[] = plain(a) && plain(b) ? [[255, 255, 255], [255, 238, 200], [214, 226, 255]] : [[255, 255, 255], lift(a, 0.55), lift(b, 0.55)]
  const flakes = Array.from({ length: Math.round(170 * k) }, () => ({ x: rand(0, w), y: rand(0, h), s: rand(0.8, 2.2), ang: rand(0, Math.PI), ph: rand(0, TAU), tint: tints[Math.floor(Math.random() * tints.length)], drift: rand(-1, 1) }))
  return (ctx, _dt, t) => {
    ctx.globalCompositeOperation = 'lighter'
    const view = t * 0.55
    for (const f of flakes) {
      const along = (f.x * 0.9 + f.y * 0.5) * 0.0105 // the light front moves diagonally across the card
      const facet = Math.cos((f.ang - view - along) * 2)
      const flash = Math.pow(Math.max(0, facet), 26) * (0.65 + 0.35 * Math.sin(t * 2.4 + f.ph))
      const x = f.x + Math.sin(t * 0.3 + f.ph) * 1.4 * f.drift
      const y = f.y + Math.cos(t * 0.27 + f.ph) * 1.4 * f.drift
      ctx.fillStyle = rgba(f.tint, 0.1 + flash * 0.9)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(f.ang)
      ctx.fillRect(-f.s, -f.s * 0.6, f.s * 2, f.s * 1.2)
      ctx.restore()
      if (flash > 0.3) {
        const L = f.s * (2.5 + flash * 6)
        ctx.strokeStyle = rgba(f.tint, flash * 0.9)
        ctx.lineWidth = 0.7
        ctx.beginPath()
        ctx.moveTo(x - L, y)
        ctx.lineTo(x + L, y)
        ctx.moveTo(x, y - L)
        ctx.lineTo(x, y + L)
        ctx.stroke()
        ctx.lineWidth = 0.5
        const D = L * 0.42
        ctx.beginPath()
        ctx.moveTo(x - D, y - D)
        ctx.lineTo(x + D, y + D)
        ctx.moveTo(x - D, y + D)
        ctx.lineTo(x + D, y - D)
        ctx.stroke()
        ctx.fillStyle = rgba([255, 255, 255], flash)
        dot(ctx, x, y, f.s * 0.8)
      }
    }
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ============================================================================================================
// starfield: stars wheel slowly round a pole, with real star colours, a dusty galactic band, scintillation,
// diffraction spikes on the brightest, and meteors with tapered tails.
// ============================================================================================================
function stars({ w, h, n, speed }: Opts): Sim {
  const k = power(n)
  const pole = { x: w * 0.8, y: h * 1.15 }
  const temp = (): Rgb => {
    const r = Math.random()
    return r < 0.28 ? [170, 200, 255] : r < 0.78 ? [255, 255, 255] : r < 0.92 ? [255, 236, 190] : [255, 190, 140]
  }
  type St = { r: number; th: number; size: number; c: Rgb; ph: number; mag: number }
  const make = (x: number, y: number, size: number): St => ({ r: Math.hypot(x - pole.x, y - pole.y), th: Math.atan2(y - pole.y, x - pole.x), size, c: temp(), ph: rand(0, 100), mag: size })
  const field: St[] = []
  for (let i = 0; i < 150 * k; i++) field.push(make(rand(-30, w + 30), rand(-30, h + 30), Math.pow(Math.random(), 4) * 1.5 + 0.35))
  // the dusty band, a gaussian cloud around a diagonal line
  const bx0 = -w * 0.1, by0 = h * 0.95, bx1 = w * 1.1, by1 = h * 0.08
  const bl = Math.hypot(bx1 - bx0, by1 - by0)
  const nx = -(by1 - by0) / bl, ny = (bx1 - bx0) / bl
  for (let i = 0; i < 260 * k; i++) {
    const u = Math.random()
    const off = (Math.random() + Math.random() + Math.random() - 1.5) * h * 0.2
    field.push(make(bx0 + (bx1 - bx0) * u + nx * off, by0 + (by1 - by0) * u + ny * off, rand(0.3, 0.75)))
  }
  type M = { x: number; y: number; vx: number; vy: number; age: number; life: number }
  const meteors: M[] = []
  let next = rand(1.5, 4)
  return (ctx, dt, t) => {
    ctx.save()
    ctx.translate(bx0 + (bx1 - bx0) / 2, by0 + (by1 - by0) / 2)
    ctx.rotate(Math.atan2(by1 - by0, bx1 - bx0))
    const band = ctx.createLinearGradient(0, -h * 0.28, 0, h * 0.28)
    band.addColorStop(0, 'rgba(190,200,255,0)')
    band.addColorStop(0.5, 'rgba(190,200,255,0.04)')
    band.addColorStop(1, 'rgba(190,200,255,0)')
    ctx.fillStyle = band
    ctx.fillRect(-bl, -h * 0.28, bl * 2, h * 0.56)
    ctx.restore()

    const rot = t * 0.012
    for (const s of field) {
      const th = s.th + rot
      const x = pole.x + Math.cos(th) * s.r
      const y = pole.y + Math.sin(th) * s.r
      if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue
      const tw = 0.62 + 0.38 * vnoise(t * (3 + s.size * 2) + s.ph) * (0.7 + 0.3 * Math.sin(t * 0.7 + s.ph))
      ctx.fillStyle = rgba(s.c, tw * (s.size > 0.9 ? 1 : 0.8))
      dot(ctx, x, y, s.size * 0.7)
      if (s.size > 1.2) {
        ctx.strokeStyle = rgba(s.c, tw * 0.4)
        ctx.lineWidth = 0.5
        const L = s.size * 4.5
        ctx.beginPath()
        ctx.moveTo(x - L, y)
        ctx.lineTo(x + L, y)
        ctx.moveTo(x, y - L)
        ctx.lineTo(x, y + L)
        ctx.stroke()
      }
    }
    next -= dt * speed
    if (next < 0 && meteors.length < 2) {
      const ang = rand(0.4, 0.75)
      const v = rand(520, 760)
      meteors.push({ x: rand(-10, w * 0.65), y: rand(-10, h * 0.3), vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, age: 0, life: rand(0.6, 1) })
      next = rand(3, 8)
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]
      m.age += dt
      if (m.age > m.life) {
        meteors.splice(i, 1)
        continue
      }
      m.x += m.vx * dt
      m.y += m.vy * dt
      const q = m.age / m.life
      const a = Math.sin(Math.PI * Math.min(1, q * 1.15))
      const sp = Math.hypot(m.vx, m.vy)
      const len = 130
      const tx = m.x - (m.vx / sp) * len
      const ty = m.y - (m.vy / sp) * len
      const px = -(m.vy / sp)
      const py = m.vx / sp
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty)
      g.addColorStop(0, `rgba(255,255,255,${a})`)
      g.addColorStop(0.25, `rgba(190,215,255,${a * 0.5})`)
      g.addColorStop(1, 'rgba(160,190,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(m.x + px * 1.2, m.y + py * 1.2)
      ctx.lineTo(tx, ty)
      ctx.lineTo(m.x - px * 1.2, m.y - py * 1.2)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = `rgba(255,255,255,${a})`
      dot(ctx, m.x, m.y, 1.6)
    }
  }
}

// ============================================================================================================
// aurora: curtains made of many thin vertical rays that shimmer and sway, over a few faint stars.
// ============================================================================================================
function aurora({ w, h, n, speed, a, b }: Opts): Sim {
  const A = plain(a) ? ([70, 255, 170] as Rgb) : a
  const B = plain(b) ? ([150, 90, 255] as Rgb) : b
  const bands = [A, mix(A, B, 0.5), B]
  const strength = Math.min(1.4, 0.5 + n / 40)
  const bg = Array.from({ length: 40 }, () => ({ x: rand(0, w), y: rand(0, h * 0.7), s: rand(0.3, 0.9), ph: rand(0, TAU) }))
  return (ctx, _dt, t) => {
    ctx.fillStyle = '#fff'
    for (const s of bg) {
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 1.3 + s.ph)
      dot(ctx, s.x, s.y, s.s)
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'lighter'
    const H = 100
    bands.forEach((c, i) => {
      const base = h * (0.2 + i * 0.13)
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, rgba(lift(c, 0.3), 0))
      g.addColorStop(0.1, rgba(lift(c, 0.3), 1))
      g.addColorStop(0.4, rgba(c, 0.5))
      g.addColorStop(1, rgba(c, 0))
      ctx.fillStyle = g
      const step = 2.5
      for (let x = 0; x < w; x += step) {
        const curve = base + Math.sin(x * 0.011 + t * 0.45 * speed + i * 2.1) * h * 0.06 + Math.sin(x * 0.026 - t * 0.28 * speed + i) * h * 0.03 + Math.sin(x * 0.005 + t * 0.12 * speed) * h * 0.04
        const shimmer = Math.pow(0.5 + 0.5 * Math.sin(x * 0.045 - t * 0.9 * speed + i * 3), 2) * (0.55 + 0.45 * Math.sin(x * 0.13 + t * 1.7 + i))
        const len = h * (0.26 + 0.2 * (0.5 + 0.5 * Math.sin(x * 0.06 + t * 0.5 + i * 1.7)))
        ctx.globalAlpha = Math.min(1, shimmer * 0.5 * strength)
        ctx.save()
        ctx.translate(x, curve - h * 0.05)
        ctx.scale(1, len / H)
        ctx.fillRect(0, 0, step + 0.5, H)
        ctx.restore()
      }
    })
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ============================================================================================================
// fireflies: each wanders on a smooth path and flashes in its own rhythm, a short bright pulse, then dark.
// ============================================================================================================
function fireflies({ w, h, n, speed, a }: Opts): Sim {
  const colour: Rgb = plain(a) ? [196, 255, 90] : mix([196, 255, 90], a, 0.5)
  const k = power(n)
  const flies = Array.from({ length: Math.max(7, Math.round(18 * k)) }, () => ({
    x: rand(0, w), y: rand(h * 0.2, h), ph: rand(0, 100), cyc: rand(2.6, 5), on: rand(0.35, 0.7), dbl: Math.random() < 0.4, s: rand(0.9, 1.5), trail: [] as [number, number][],
  }))
  return (ctx, dt, t) => {
    ctx.globalCompositeOperation = 'lighter'
    for (const f of flies) {
      f.x += (vnoise(t * 0.25 + f.ph) - 0.5) * 38 * speed * dt * 2
      f.y += (vnoise(t * 0.21 + f.ph * 2.1) - 0.5) * 30 * speed * dt * 2 - 1.5 * dt
      if (f.x < -10) f.x = w + 10
      if (f.x > w + 10) f.x = -10
      if (f.y < -10) f.y = h + 10
      if (f.y > h + 10) f.y = -10
      const p = ((t + f.ph) % f.cyc) / f.cyc
      let lit = 0
      if (p < f.on / f.cyc) lit = Math.sin((p / (f.on / f.cyc)) * Math.PI)
      else if (f.dbl && p > (f.on * 1.5) / f.cyc && p < (f.on * 2.3) / f.cyc) lit = Math.sin(((p - (f.on * 1.5) / f.cyc) / ((f.on * 0.8) / f.cyc)) * Math.PI) * 0.8
      f.trail.push([f.x, f.y])
      if (f.trail.length > 7) f.trail.shift()
      if (lit < 0.03) continue
      ctx.strokeStyle = rgba(colour, lit * 0.35)
      ctx.lineWidth = 1
      ctx.beginPath()
      f.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.stroke()
      ctx.fillStyle = rgba(colour, lit * 0.22)
      dot(ctx, f.x, f.y, 5.5 * f.s)
      ctx.fillStyle = rgba(lift(colour, 0.5), lit)
      dot(ctx, f.x, f.y, 1.5 * f.s)
    }
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ============================================================================================================
// petals: blossom that tumbles in 3D. Each petal has a front and a back, lit differently as it turns.
// ============================================================================================================
function petals({ w, h, n, speed }: Opts): Sim {
  const k = power(n)
  const ps = Array.from({ length: Math.max(4, Math.round(24 * k)) }, () => ({ x: rand(0, w), y: rand(-h, h), s: rand(5, 10), rot: rand(0, TAU), vr: rand(-0.9, 0.9), ph: rand(0, TAU), f: rand(0.5, 1.4), vy: rand(24, 48), tone: Math.random() }))
  return (ctx, dt, t) => {
    const wind = Math.sin(t * 0.22) * 16 + 12
    for (const p of ps) {
      p.y += p.vy * speed * dt
      p.x += (wind + Math.sin(t * p.f + p.ph) * 24) * speed * dt
      p.rot += p.vr * dt * speed
      if (p.y > h + 14) {
        p.y = -14
        p.x = rand(-20, w)
      }
      if (p.x > w + 20) p.x = -20
      const tilt = Math.cos(t * p.f * 1.5 + p.ph)
      const face = Math.abs(tilt)
      const front = tilt > 0
      const base: Rgb = mix([255, 190, 208], [255, 226, 234], p.tone)
      const edge: Rgb = mix([232, 108, 146], [250, 150, 178], p.tone)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(Math.max(0.1, face), 1 - (1 - face) * 0.18)
      const g = ctx.createLinearGradient(0, -p.s, 0, p.s)
      g.addColorStop(0, rgba(shade(base, front ? 0 : 0.2), 1))
      g.addColorStop(1, rgba(shade(edge, front ? 0 : 0.22), 1))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(0, p.s)
      ctx.bezierCurveTo(p.s * 0.95, p.s * 0.55, p.s * 0.85, -p.s * 0.7, p.s * 0.18, -p.s)
      ctx.lineTo(0, -p.s * 0.78) // the little notch at the tip
      ctx.lineTo(-p.s * 0.18, -p.s)
      ctx.bezierCurveTo(-p.s * 0.85, -p.s * 0.7, -p.s * 0.95, p.s * 0.55, 0, p.s)
      ctx.fill()
      ctx.strokeStyle = rgba(shade(edge, 0.25), 0.35)
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(0, p.s * 0.9)
      ctx.lineTo(0, -p.s * 0.6)
      ctx.stroke()
      ctx.restore()
    }
  }
}

// ============================================================================================================
// bubbles: soap bubbles. A thin-film rainbow rim that slowly shifts, two sharp window reflections, wobble,
// and a tiny spray of droplets when one pops.
// ============================================================================================================
function bubbles({ w, h, n, speed }: Opts): Sim {
  const k = power(n)
  const make = (below = false) => ({ x: rand(0, w), y: below ? h + rand(10, 80) : rand(0, h), r: rand(5, 20), vy: rand(14, 36), ph: rand(0, TAU), f: rand(0.5, 1.3), pop: rand(h * 0.08, h * 0.6) })
  const bs = Array.from({ length: Math.max(3, Math.round(12 * k)) }, () => make())
  const spray: { x: number; y: number; vx: number; vy: number; age: number }[] = []
  return (ctx, dt, t) => {
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i]
      b.y -= b.vy * (0.6 + b.r / 26) * speed * dt
      b.x += Math.sin(t * b.f + b.ph) * 12 * speed * dt
      if (b.y < b.pop || b.y < -b.r) {
        if (b.y > -b.r) for (let j = 0; j < 9; j++) spray.push({ x: b.x, y: b.y, vx: Math.cos((j / 9) * TAU) * rand(14, 40), vy: Math.sin((j / 9) * TAU) * rand(14, 40), age: 0 })
        bs[i] = make(true)
        continue
      }
      const wob = 1 + Math.sin(t * 2.6 + b.ph) * 0.045
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.scale(wob, 1 / wob)
      const r = b.r
      const body = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r)
      body.addColorStop(0, 'rgba(210,235,255,0)')
      body.addColorStop(0.8, 'rgba(210,235,255,0.05)')
      body.addColorStop(1, 'rgba(230,240,255,0.2)')
      ctx.fillStyle = body
      dot(ctx, 0, 0, r)
      // the thin-film rainbow around the rim
      const cg = typeof ctx.createConicGradient === 'function' ? ctx.createConicGradient(t * 0.35 + b.ph, 0, 0) : null
      if (cg) {
        for (let s = 0; s <= 6; s++) cg.addColorStop(s / 6, `hsla(${(s * 60 + t * 40 + b.ph * 30) % 360},85%,72%,0.5)`)
        ctx.strokeStyle = cg
      } else ctx.strokeStyle = 'rgba(200,230,255,0.4)'
      ctx.lineWidth = Math.max(1, r * 0.1)
      ctx.beginPath()
      ctx.arc(0, 0, r - ctx.lineWidth / 2, 0, TAU)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, TAU)
      ctx.stroke()
      // two crisp reflections
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineCap = 'round'
      ctx.lineWidth = Math.max(1, r * 0.13)
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.68, Math.PI * 1.08, Math.PI * 1.34)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = Math.max(0.8, r * 0.07)
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.7, Math.PI * 0.05, Math.PI * 0.2)
      ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = 'rgba(225,240,255,0.8)'
    for (let i = spray.length - 1; i >= 0; i--) {
      const s = spray[i]
      s.age += dt
      if (s.age > 0.45) {
        spray.splice(i, 1)
        continue
      }
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.vy += 90 * dt
      ctx.globalAlpha = 1 - s.age / 0.45
      dot(ctx, s.x, s.y, 0.9)
    }
    ctx.globalAlpha = 1
  }
}

// ============================================================================================================
// storm: bolts of lightning built by midpoint displacement with branches. Each strike re-flickers, lights the
// whole card for an instant and leaves a fading after-image.
// ============================================================================================================
type Pt = [number, number]
function jag(a: Pt, b: Pt, disp: number, depth: number): Pt[] {
  if (depth === 0) return [a, b]
  const mx = (a[0] + b[0]) / 2 + rand(-disp, disp)
  const my = (a[1] + b[1]) / 2 + rand(-disp * 0.4, disp * 0.4)
  const m: Pt = [mx, my]
  return [...jag(a, m, disp / 1.9, depth - 1).slice(0, -1), ...jag(m, b, disp / 1.9, depth - 1)]
}
function makeBolt(w: number, h: number) {
  const x0 = rand(w * 0.2, w * 0.8)
  const end: Pt = [x0 + rand(-w * 0.18, w * 0.18), h * rand(0.62, 0.95)]
  const main = jag([x0, -10], end, h * 0.07, 6)
  const paths: { pts: Pt[]; width: number }[] = [{ pts: main, width: 1 }]
  for (let i = 0; i < 4; i++) {
    const p = main[Math.floor(rand(0.15, 0.8) * main.length)]
    const dir = (Math.random() < 0.5 ? -1 : 1) * rand(0.3, 0.8)
    const len = rand(h * 0.12, h * 0.3)
    const to: Pt = [p[0] + Math.sin(dir) * len, p[1] + Math.cos(dir) * len]
    paths.push({ pts: jag(p, to, len * 0.18, 4), width: 0.5 })
  }
  return paths
}

function lightning({ w, h, n, speed }: Opts): Sim {
  const k = power(n)
  let bolt: ReturnType<typeof makeBolt> | null = null
  let age = 0
  let next = rand(0.6, 2)
  let sky = 0
  const rainDrops = Array.from({ length: Math.round(40 * k) }, () => ({ x: rand(-30, w), y: rand(-h, h), z: Math.random() }))
  const pattern = [1, 0.15, 0.85, 0.3, 0.7, 0.1, 0.5, 0.05]
  return (ctx, dt) => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(190,210,255,0.22)'
    for (const d of rainDrops) {
      d.y += (620 + d.z * 360) * speed * dt
      d.x += 120 * speed * dt
      if (d.y > h + 20) {
        d.y = -20
        d.x = rand(-30, w)
      }
      ctx.lineWidth = 0.5 + d.z * 0.5
      ctx.beginPath()
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x - 4, d.y - 20 - d.z * 8)
      ctx.stroke()
    }
    next -= dt
    if (next < 0 && !bolt) {
      bolt = makeBolt(w, h)
      age = 0
      next = rand(3.5, 8) / Math.max(0.5, speed)
    }
    if (bolt) {
      age += dt
      const step = Math.floor(age / 0.055)
      const flick = pattern[step] ?? 0
      if (flick <= 0 && step >= pattern.length) bolt = null
      else {
        sky = Math.max(sky, flick)
        ctx.globalCompositeOperation = 'lighter'
        for (const p of bolt) {
          for (const [lw, al, col] of [[7 * p.width, 0.1, '150,180,255'], [3 * p.width, 0.3, '190,210,255'], [1.1 * p.width, 1, '255,255,255']] as const) {
            ctx.strokeStyle = `rgba(${col},${al * flick})`
            ctx.lineWidth = lw
            ctx.beginPath()
            p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
            ctx.stroke()
          }
        }
        ctx.globalCompositeOperation = 'source-over'
      }
    }
    if (sky > 0.01) {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, `rgba(205,220,255,${sky * 0.22})`)
      g.addColorStop(1, `rgba(205,220,255,${sky * 0.04})`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      sky *= Math.pow(0.0008, dt)
    }
  }
}

// ============================================================================================================
// code: falling glyph columns. White-hot heads, trails that fade, symbols that keep changing.
// ============================================================================================================
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:.=*+-<>'
function code({ w, h, n, speed, a }: Opts): Sim {
  const colour: Rgb = plain(a) ? [70, 255, 130] : a
  const size = 13
  const cols = Math.ceil(w / size)
  const k = power(n)
  type Col = { y: number; v: number; len: number; glyphs: string[]; wait: number; tick: number }
  const mk = (): Col => ({ y: -rand(0, h), v: rand(70, 190), len: Math.round(rand(8, 22)), glyphs: Array.from({ length: 24 }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]), wait: 0, tick: 0 })
  const columns = Array.from({ length: cols }, (_, i) => ({ ...mk(), wait: hash(i) * 4 }))
  const active = clamp(0.2 + k * 0.4, 0.2, 0.95)
  return (ctx, dt) => {
    ctx.font = `${size}px ui-monospace, Menlo, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    columns.forEach((c, i) => {
      if (c.wait > 0) {
        c.wait -= dt
        return
      }
      c.y += c.v * speed * dt
      c.tick += dt
      if (c.tick > 0.09) {
        c.tick = 0
        c.glyphs[Math.floor(Math.random() * c.glyphs.length)] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      }
      if (c.y - c.len * size > h) {
        Object.assign(c, mk(), { y: -size, wait: Math.random() < active ? rand(0, 1.5) : rand(2, 8) })
        return
      }
      const x = i * size + size / 2
      for (let j = 0; j < c.len; j++) {
        const gy = Math.floor(c.y / size) * size - j * size
        if (gy < -size || gy > h) continue
        const q = j / c.len
        if (j === 0) ctx.fillStyle = 'rgba(235,255,240,0.95)'
        else ctx.fillStyle = rgba(j < 3 ? lift(colour, 0.35) : colour, Math.pow(1 - q, 1.6) * 0.75)
        ctx.fillText(c.glyphs[(j + Math.floor(gy / size)) % c.glyphs.length], x, gy)
      }
    })
  }
}

// ============================================================================================================
// leaves: autumn leaves that tumble and flip, with veins, a stem, and a darker back side.
// ============================================================================================================
function leaves({ w, h, n, speed }: Opts): Sim {
  const k = power(n)
  const palette: Rgb[] = [[196, 58, 30], [226, 106, 28], [232, 162, 38], [150, 52, 28], [178, 120, 36]]
  const ls = Array.from({ length: Math.max(5, Math.round(16 * k)) }, () => ({ x: rand(0, w), y: rand(-h, h), s: rand(11, 20), rot: rand(0, TAU), vr: rand(-1.4, 1.4), ph: rand(0, TAU), f: rand(0.5, 1.2), vy: rand(30, 58), c: palette[Math.floor(Math.random() * palette.length)] }))
  // an oak-like outline: pointed tip, rounded lobes down each side, stem at the bottom
  const lobes = (s: number) => {
    ctx0.beginPath()
    const N = 28
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i <= N; i++) {
        const u = side === 0 ? i / N : 1 - i / N // 0 at the stem, 1 at the tip
        const body = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 0.8)
        const wv = s * 0.62 * body * (0.74 + 0.26 * Math.cos(u * Math.PI * 7))
        const x = (side === 0 ? -1 : 1) * wv
        const y = s * (0.8 - 1.7 * u)
        if (side === 0 && i === 0) ctx0.moveTo(x, y)
        else ctx0.lineTo(x, y)
      }
    }
    ctx0.closePath()
  }
  let ctx0: CanvasRenderingContext2D
  return (ctx, dt, t) => {
    ctx0 = ctx
    const wind = Math.sin(t * 0.25) * 22 + 14
    for (const l of ls) {
      l.y += l.vy * speed * dt
      l.x += (wind + Math.sin(t * l.f + l.ph) * 34) * speed * dt
      l.rot += l.vr * dt * speed
      if (l.y > h + 20) {
        l.y = -20
        l.x = rand(-30, w)
      }
      if (l.x > w + 30) l.x = -30
      const tilt = Math.cos(t * l.f * 1.3 + l.ph)
      const face = Math.abs(tilt)
      const front = tilt > 0
      ctx.save()
      ctx.translate(l.x, l.y)
      ctx.rotate(l.rot)
      ctx.scale(Math.max(0.22, face), 1 - (1 - face) * 0.2)
      lobes(l.s)
      ctx.fillStyle = rgba(front ? l.c : shade(l.c, 0.28), 1)
      ctx.fill()
      ctx.strokeStyle = rgba(shade(l.c, 0.45), 0.55)
      ctx.lineWidth = 0.7
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, l.s * 0.8)
      ctx.lineTo(0, -l.s * 0.85)
      for (let v = 0; v < 4; v++) {
        const y = l.s * (0.5 - v * 0.38)
        ctx.moveTo(0, y)
        ctx.lineTo(l.s * 0.36, y - l.s * 0.22)
        ctx.moveTo(0, y)
        ctx.lineTo(-l.s * 0.36, y - l.s * 0.22)
      }
      ctx.stroke()
      ctx.strokeStyle = rgba(shade(l.c, 0.5), 0.9)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, l.s * 0.8)
      ctx.lineTo(0, l.s * 1.2)
      ctx.stroke()
      ctx.restore()
    }
  }
}

// ============================================================================================================
// confetti: paper that flips as it falls (shaded front and back), fired in bursts from both bottom corners
// on top of a gentle drizzle from above.
// ============================================================================================================
function confetti({ w, h, n, speed, a, b }: Opts): Sim {
  const k = power(n)
  const pal: Rgb[] = [[255, 90, 130], [255, 200, 60], [60, 200, 255], [150, 110, 255], [90, 230, 150], [255, 255, 255]]
  if (!(plain(a) && plain(b))) pal.push(a, b, lift(a, 0.4), lift(b, 0.4))
  type P = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; fl: number; vf: number; w: number; h: number; c: Rgb; ribbon: boolean; ph: number }
  const ps: P[] = []
  const add = (x: number, y: number, vx: number, vy: number): P => {
    const p: P = { x, y, vx, vy, rot: rand(0, TAU), vr: rand(-6, 6), fl: rand(0, TAU), vf: rand(4, 11), w: rand(4, 8), h: rand(7, 13), c: pal[Math.floor(Math.random() * pal.length)], ribbon: Math.random() < 0.2, ph: rand(0, TAU) }
    ps.push(p)
    return p
  }
  let nextBurst = 0.4
  let drip = 0
  return (ctx, dt, t) => {
    nextBurst -= dt
    if (nextBurst < 0) {
      const cnt = Math.round(22 * k)
      for (let i = 0; i < cnt; i++) {
        add(-4, h + 4, rand(120, 330), -rand(560, 920))
        add(w + 4, h + 4, -rand(120, 330), -rand(560, 920))
      }
      nextBurst = rand(7, 12)
    }
    drip += dt * 2.4 * k
    while (drip > 1) {
      drip -= 1
      add(rand(0, w), -10, rand(-14, 14), rand(20, 50))
    }
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]
      p.vy += 260 * dt * speed
      const drag = Math.exp(-2.6 * dt)
      p.vx *= drag
      p.vy *= drag
      p.x += (p.vx + Math.sin(t * 2 + p.ph) * 14) * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      p.fl += p.vf * dt
      if (p.y > h + 30 || p.x < -40 || p.x > w + 40) {
        ps.splice(i, 1)
        continue
      }
      const f = Math.cos(p.fl)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(1, Math.max(0.08, Math.abs(f)))
      ctx.fillStyle = rgba(f > 0 ? p.c : shade(p.c, 0.3), 1)
      if (p.ribbon) {
        ctx.beginPath()
        ctx.moveTo(-p.w * 0.4, -p.h)
        ctx.bezierCurveTo(p.w, -p.h * 0.4, -p.w, p.h * 0.4, p.w * 0.4, p.h)
        ctx.lineTo(p.w * 0.9, p.h)
        ctx.bezierCurveTo(-p.w * 0.1, p.h * 0.4, p.w * 1.8, -p.h * 0.4, p.w * 0.1, -p.h)
        ctx.fill()
      } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
  }
}

// ============================================================================================================
// fireworks: rockets climb with a thin trail, burst into streaking sparks that arc under gravity and fade
// through white, colour, then dull ember.
// ============================================================================================================
function fireworks({ w, h, n, speed, a, b }: Opts): Sim {
  const k = power(n)
  const cols: Rgb[] = plain(a) && plain(b) ? [[255, 90, 90], [255, 200, 70], [90, 190, 255], [150, 255, 160], [220, 130, 255]] : [a, b, lift(a, 0.4), lift(b, 0.4)]
  type R = { x: number; y: number; ty: number; vy: number; c: Rgb; trail: Pt[] }
  type P = { x: number; y: number; vx: number; vy: number; age: number; life: number; c: Rgb; trail: Pt[]; crackle: boolean }
  const rockets: R[] = []
  const ps: P[] = []
  let next = 0.3
  const burst = (x: number, y: number, c: Rgb) => {
    const ring = Math.random() < 0.4
    const cnt = Math.round(46 + 40 * k)
    for (let i = 0; i < cnt; i++) {
      const ang = (i / cnt) * TAU + rand(-0.04, 0.04)
      const sp = ring ? 112 : rand(30, 135)
      ps.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, age: 0, life: rand(1.2, 2.1), c: Math.random() < 0.25 ? lift(c, 0.6) : c, trail: [], crackle: Math.random() < 0.15 })
    }
  }
  return (ctx, dt) => {
    next -= dt * speed
    if (next < 0 && rockets.length < 2) {
      rockets.push({ x: rand(w * 0.15, w * 0.85), y: h + 4, ty: rand(h * 0.18, h * 0.5), vy: -rand(300, 380), c: cols[Math.floor(Math.random() * cols.length)], trail: [] })
      next = rand(1.1, 2.6) / Math.max(0.4, k)
    }
    ctx.lineCap = 'round'
    ctx.globalCompositeOperation = 'lighter'
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]
      r.y += r.vy * dt
      r.vy *= 1 - 0.55 * dt
      r.x += Math.sin(r.y * 0.05) * 6 * dt
      r.trail.push([r.x, r.y])
      if (r.trail.length > 10) r.trail.shift()
      if (r.y <= r.ty) {
        burst(r.x, r.y, r.c)
        rockets.splice(i, 1)
        continue
      }
      r.trail.forEach(([x, y], j) => {
        ctx.fillStyle = `rgba(255,226,170,${(j / r.trail.length) * 0.6})`
        dot(ctx, x, y, 0.9)
      })
      ctx.fillStyle = '#fff'
      dot(ctx, r.x, r.y, 1.3)
    }
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]
      p.age += dt
      if (p.age > p.life) {
        ps.splice(i, 1)
        continue
      }
      p.vy += 70 * dt
      const d = Math.exp(-1.3 * dt)
      p.vx *= d
      p.vy *= d
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.trail.push([p.x, p.y])
      if (p.trail.length > 7) p.trail.shift()
      const q = p.age / p.life
      const a = (1 - q) * (p.crackle && q > 0.5 ? (Math.random() < 0.5 ? 1 : 0.1) : 1)
      const c = q < 0.2 ? mix([255, 255, 255], p.c, q / 0.2) : mix(p.c, shade(p.c, 0.6), (q - 0.2) / 0.8)
      for (let j = 1; j < p.trail.length; j++) {
        ctx.strokeStyle = rgba(c, a * (j / p.trail.length))
        ctx.lineWidth = 1.3 * (j / p.trail.length) + 0.2
        ctx.beginPath()
        ctx.moveTo(p.trail[j - 1][0], p.trail[j - 1][1])
        ctx.lineTo(p.trail[j][0], p.trail[j][1])
        ctx.stroke()
      }
    }
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ============================================================================================================
// rays: shafts of light through a window with dust that only becomes visible where it crosses a beam.
// ============================================================================================================
function rays({ w, h, n, speed, a }: Opts): Sim {
  const k = power(n)
  const tint: Rgb = plain(a) ? [255, 236, 200] : lift(a, 0.55)
  const sprite = document.createElement('canvas')
  sprite.width = 128
  sprite.height = 512
  const g = sprite.getContext('2d')!
  const hz = g.createLinearGradient(0, 0, 128, 0)
  hz.addColorStop(0, 'rgba(255,255,255,0)')
  hz.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  hz.addColorStop(0.5, 'rgba(255,255,255,1)')
  hz.addColorStop(0.82, 'rgba(255,255,255,0.55)')
  hz.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = hz
  g.fillRect(0, 0, 128, 512)
  g.globalCompositeOperation = 'destination-in'
  const vt = g.createLinearGradient(0, 0, 0, 512)
  vt.addColorStop(0, 'rgba(255,255,255,1)')
  vt.addColorStop(0.7, 'rgba(255,255,255,0.35)')
  vt.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = vt
  g.fillRect(0, 0, 128, 512)
  const beams = Array.from({ length: 6 }, (_, i) => ({ x: -w * 0.1 + (i / 5) * w * 1.0 + rand(-20, 20), wd: rand(40, 110), al: rand(0.05, 0.1), ph: rand(0, TAU), f: rand(0.1, 0.3) }))
  const ANG = 0.5
  const dust = Array.from({ length: Math.round(75 * k) }, () => ({ x: rand(0, w), y: rand(0, h), s: rand(0.5, 1.5), ph: rand(0, 100), z: rand(0.4, 1) }))
  return (ctx, dt, t) => {
    const sinA = Math.sin(ANG)
    const cosA = Math.cos(ANG)
    ctx.globalCompositeOperation = 'lighter'
    for (const b of beams) {
      const pulse = 0.6 + 0.4 * Math.sin(t * b.f + b.ph)
      ctx.save()
      ctx.translate(b.x + Math.sin(t * 0.07 + b.ph) * 14, -20)
      ctx.rotate(-ANG)
      ctx.globalAlpha = b.al * pulse * (0.6 + k * 0.5)
      ctx.drawImage(sprite, -b.wd / 2, 0, b.wd, h * 1.6)
      ctx.restore()
    }
    ctx.globalAlpha = 1
    for (const d of dust) {
      d.x += (vnoise(t * 0.2 + d.ph) - 0.46) * 14 * d.z * speed * dt
      d.y += (vnoise(t * 0.17 + d.ph * 1.7) - 0.56) * 12 * d.z * speed * dt
      if (d.x < -5) d.x = w + 5
      if (d.x > w + 5) d.x = -5
      if (d.y < -5) d.y = h + 5
      if (d.y > h + 5) d.y = -5
      let lit = 0
      for (const b of beams) {
        const cx = b.x + Math.sin(t * 0.07 + b.ph) * 14
        const along = d.x - cx - ((d.y + 20) * sinA) / cosA // how far left or right of the beam's centre line
        const dist = Math.abs(along * cosA)
        lit = Math.max(lit, clamp(1 - dist / (b.wd * 0.42)))
      }
      ctx.fillStyle = rgba(tint, 0.1 + lit * 0.85 * (0.6 + 0.4 * Math.sin(t * 2 + d.ph)))
      dot(ctx, d.x, d.y, d.s * (0.7 + lit * 0.5))
    }
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ============================================================================================================
// caustics: the shifting net of bright lines that sunlight makes on the floor of a pool, computed per pixel
// at low resolution and scaled up.
// ============================================================================================================
function caustics({ w, h, n, a }: Opts): Sim {
  const cw = Math.max(40, Math.round(w / 4))
  const ch = Math.max(40, Math.round(h / 4))
  const buf = document.createElement('canvas')
  buf.width = cw
  buf.height = ch
  const bg = buf.getContext('2d')!
  const img = bg.createImageData(cw, ch)
  const tint: Rgb = plain(a) ? [150, 225, 255] : mix([150, 225, 255], a, 0.5)
  const gain = 0.55 + clamp(n / 60) * 0.7
  const motes = Array.from({ length: 28 }, () => ({ x: rand(0, w), y: rand(0, h), s: rand(0.4, 1.1), ph: rand(0, 100) }))
  return (ctx, dt, t) => {
    const tt = t * 0.5 + 23
    const data = img.data
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        // after the "tileable water caustic" shader: a few passes of domain warping, then a sharp power curve
        const px = ((x / cw) * TAU * 1.5) % TAU - 250
        const py = ((y / ch) * TAU * 1.8) % TAU - 250
        let ix = px
        let iy = py
        let c = 1
        for (let i = 0; i < 4; i++) {
          const t2 = tt * (1 - 3.5 / (i + 1))
          ix = px + Math.cos(t2 - ix) + Math.sin(t2 + iy)
          iy = py + Math.sin(t2 - iy) + Math.cos(t2 + ix)
          c += 1 / Math.hypot(px / (Math.sin(ix + t2) / 0.005), py / (Math.cos(iy + t2) / 0.005))
        }
        c /= 4
        c = 1.17 - Math.pow(c, 1.4)
        const v = clamp(Math.pow(Math.abs(c), 8) * gain * 0.32)
        const o = (y * cw + x) * 4
        data[o] = tint[0]
        data[o + 1] = tint[1]
        data[o + 2] = tint[2]
        data[o + 3] = v * 255
      }
    }
    bg.putImageData(img, 0, 0)
    const tintBg = ctx.createLinearGradient(0, 0, 0, h)
    tintBg.addColorStop(0, 'rgba(20,90,140,0.14)')
    tintBg.addColorStop(1, 'rgba(10,50,90,0.2)')
    ctx.fillStyle = tintBg
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'lighter'
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(buf, 0, 0, w, h)
    ctx.fillStyle = 'rgba(210,240,255,0.5)'
    for (const m of motes) {
      m.x += (vnoise(t * 0.3 + m.ph) - 0.5) * 12 * dt
      m.y += (vnoise(t * 0.27 + m.ph * 2) - 0.5) * 10 * dt
      dot(ctx, ((m.x % w) + w) % w, ((m.y % h) + h) % h, m.s)
    }
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ============================================================================================================
// film: 16mm. Grain that changes every frame, hairline scratches, dust and hairs, gate flicker, and a warm
// light leak that breathes along the left edge.
// ============================================================================================================
function film({ w, h, n, a }: Opts): Sim {
  const k = power(n)
  const tiles = Array.from({ length: 4 }, () => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 160
    const g = cv.getContext('2d')!
    const im = g.createImageData(160, 160)
    for (let i = 0; i < im.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 255 : 0
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v
      im.data[i + 3] = Math.pow(Math.random(), 2.2) * 150
    }
    g.putImageData(im, 0, 0)
    return cv
  })
  let acc = 1
  let frame = 0
  let offX = 0
  let offY = 0
  let flick = 0
  type Dust = { x: number; y: number; r: number; hair: boolean; ang: number; dark: boolean }
  let dust: Dust[] = []
  let scratches: { x: number; a: number; life: number }[] = []
  const leak: Rgb = plain(a) ? [255, 120, 50] : a
  return (ctx, dt, t) => {
    acc += dt
    if (acc > 1 / 16) {
      acc = 0
      frame = Math.floor(Math.random() * tiles.length)
      offX = Math.floor(rand(0, 160))
      offY = Math.floor(rand(0, 160))
      flick = rand(-1, 1)
      dust = Array.from({ length: Math.round(rand(3, 9) * (0.5 + k)) }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(0.6, 2.4), hair: Math.random() < 0.2, ang: rand(0, TAU), dark: Math.random() < 0.6 }))
      if (Math.random() < 0.1) scratches.push({ x: rand(0, w), a: rand(0.2, 0.5), life: Math.round(rand(2, 6)) })
      scratches = scratches.filter((s) => --s.life > 0)
    }
    // grain
    ctx.save()
    ctx.globalAlpha = 0.5 * (0.45 + k * 0.5)
    ctx.translate(-offX, -offY)
    ctx.fillStyle = ctx.createPattern(tiles[frame], 'repeat')!
    ctx.fillRect(0, 0, w + 160, h + 160)
    ctx.restore()
    // gate flicker
    ctx.fillStyle = `rgba(255,244,214,${Math.max(0, flick) * 0.045})`
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0, -flick) * 0.05})`
    ctx.fillRect(0, 0, w, h)
    // scratches
    ctx.lineWidth = 0.7
    for (const s of scratches) {
      ctx.strokeStyle = `rgba(255,255,255,${s.a})`
      ctx.beginPath()
      const x = s.x + Math.sin(t * 20) * 0.4
      ctx.moveTo(x, 0)
      ctx.lineTo(x + rand(-2, 2), h)
      ctx.stroke()
    }
    // dust and hairs
    for (const d of dust) {
      ctx.fillStyle = d.dark ? 'rgba(20,16,12,0.7)' : 'rgba(255,248,235,0.75)'
      if (d.hair) {
        ctx.strokeStyle = ctx.fillStyle
        ctx.lineWidth = 0.6
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.quadraticCurveTo(d.x + Math.cos(d.ang) * 8, d.y + Math.sin(d.ang) * 3, d.x + Math.cos(d.ang) * 14, d.y + Math.sin(d.ang) * 14)
        ctx.stroke()
      } else dot(ctx, d.x, d.y, d.r)
    }
    // light leak
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.5) * Math.sin(t * 0.23 + 1)
    const lg = ctx.createLinearGradient(0, 0, w * 0.4, 0)
    lg.addColorStop(0, rgba(leak, 0.06 + pulse * 0.2))
    lg.addColorStop(1, rgba(leak, 0))
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = lg
    ctx.fillRect(0, 0, w * 0.4, h)
    ctx.globalCompositeOperation = 'source-over'
    // soft vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.78)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.3)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, w, h)
  }
}

// ============================================================================================================
// vhs: scanlines, a rolling brightness bar, tracking noise along the bottom, and short glitches where
// horizontal bands tear and split into cyan and magenta.
// ============================================================================================================
function vhs({ w, h, n }: Opts): Sim {
  const k = power(n)
  const lines = document.createElement('canvas')
  lines.width = 4
  lines.height = 4
  const lg = lines.getContext('2d')!
  lg.fillStyle = 'rgba(0,0,0,0.22)'
  lg.fillRect(0, 0, 4, 1.4)
  let glitch = 0
  let next = rand(2, 5)
  let bands: { y: number; hh: number; dx: number }[] = []
  return (ctx, dt, t) => {
    ctx.fillStyle = ctx.createPattern(lines, 'repeat')!
    ctx.fillRect(0, 0, w, h)
    // rolling bar
    const y = ((t * 0.09) % 1.4) * h - h * 0.2
    const bar = ctx.createLinearGradient(0, y - 60, 0, y + 60)
    bar.addColorStop(0, 'rgba(255,255,255,0)')
    bar.addColorStop(0.5, 'rgba(255,255,255,0.07)')
    bar.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = bar
    ctx.fillRect(0, y - 60, w, 120)
    // tracking noise at the bottom
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    const base = h - 18
    for (let i = 0; i < 14 * (0.5 + k); i++) {
      const yy = base + Math.random() * 14
      const x = Math.random() * w
      ctx.fillRect(x, yy, rand(8, 70), 1)
    }
    // snow noise
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    for (let i = 0; i < 40 * k; i++) ctx.fillRect(Math.random() * w, Math.random() * h, rand(1, 3), 1)
    next -= dt
    if (next < 0) {
      glitch = rand(0.12, 0.3)
      bands = Array.from({ length: Math.round(rand(2, 5)) }, () => ({ y: rand(0, h), hh: rand(6, 38), dx: rand(-16, 16) }))
      next = rand(3, 8) / Math.max(0.4, k)
    }
    if (glitch > 0) {
      glitch -= dt
      for (const b of bands) {
        const off = b.dx + rand(-3, 3)
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = 'rgba(0,255,255,0.22)'
        ctx.fillRect(off, b.y, w, b.hh)
        ctx.fillStyle = 'rgba(255,0,110,0.22)'
        ctx.fillRect(-off, b.y + 2, w, b.hh)
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(Math.random() * w, b.y + b.hh * 0.5, rand(30, 140), 1)
      }
    }
  }
}

// ============================================================================================================
// smoke: hundreds of very faint small puffs that are carried by a swirling flow. Where they overlap they form
// the thin curling filaments real smoke has, rather than a few big soft clouds.
// ============================================================================================================
function smoke({ w, h, n, speed, a }: Opts): Sim {
  const k = power(n)
  const base: Rgb = plain(a) ? [214, 218, 228] : mix([214, 218, 228], a, 0.4)
  const puff = document.createElement('canvas')
  puff.width = puff.height = 48
  const g = puff.getContext('2d')!
  const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24)
  gr.addColorStop(0, rgba(base, 0.55))
  gr.addColorStop(0.45, rgba(base, 0.2))
  gr.addColorStop(1, rgba(base, 0))
  g.fillStyle = gr
  g.fillRect(0, 0, 48, 48)
  type P = { x: number; y: number; age: number; life: number; s0: number; seed: number; vy: number; ox: number }
  const ps: P[] = []
  const vents = [w * 0.2, w * 0.5, w * 0.8]
  let acc = 0
  return (ctx, dt, t) => {
    acc += dt * 70 * k
    while (acc > 1) {
      acc -= 1
      if (ps.length < 640) {
        const ox = vents[Math.floor(Math.random() * 3)] + rand(-6, 6)
        ps.push({ x: ox, y: h + 10, age: 0, life: rand(5, 9), s0: rand(20, 34), seed: rand(0, 1000), vy: rand(46, 84), ox })
      }
    }
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]
      p.age += dt
      if (p.age > p.life) {
        ps.splice(i, 1)
        continue
      }
      const q = p.age / p.life
      // the flow gets stronger with height, so the column is straight at the vent and curls above it
      const gust = (vnoise(p.seed + t * 0.28 + p.y * 0.012) - 0.5) * 2
      const gust2 = (vnoise(p.seed * 0.7 + t * 0.6 + p.y * 0.03) - 0.5) * 2
      const strength = 22 + (h - p.y) * 0.34
      p.x += (gust * strength + gust2 * strength * 0.4) * speed * dt
      p.y -= p.vy * (1 - q * 0.45) * speed * dt
      const size = p.s0 * (1 + q * 3.6)
      const fade = Math.min(1, q * 8) * Math.pow(1 - q, 1.3)
      ctx.globalAlpha = fade * 0.32
      ctx.drawImage(puff, p.x - size / 2, p.y - size / 2, size, size)
    }
    ctx.globalAlpha = 1
  }
}

export const SIMS: Record<Exclude<CardEffect, 'none'>, (o: Opts) => Sim> = {
  snow,
  rain,
  embers,
  sparkle,
  stars,
  aurora,
  fireflies,
  petals,
  bubbles,
  lightning,
  code,
  leaves,
  confetti,
  fireworks,
  rays,
  caustics,
  film,
  vhs,
  smoke,
}

/** How many seconds an effect is run before the first frame is shown, so it is already going when the card appears. */
const WARM: Partial<Record<Exclude<CardEffect, 'none'>, number>> = { smoke: 9, leaves: 6, petals: 5, snow: 4, rain: 2, bubbles: 5, embers: 3, fireworks: 1.2, confetti: 1.6, code: 6, fireflies: 3, rays: 0, stars: 0 }

export function CardEffectLayer({ effect, intensity = 50, speed = 50, colors = ['#ffffff', '#ffffff'] }: { effect: CardEffect; intensity?: number; speed?: number; colors?: [string, string] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { reduced } = useMotionPrefs()
  // Settings are read by the running loop, so moving a slider changes the effect smoothly without a restart.
  const live = useRef({ intensity, speed })
  live.current = { intensity, speed }

  useEffect(() => {
    const cv = ref.current
    if (!cv || effect === 'none') return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const [a, b] = [rgb(colors[0]), rgb(colors[1])]
    const st: { sim: Sim | null } = { sim: null }
    let w = 0
    let h = 0
    let builtFor = -1
    let raf = 0
    let last = performance.now()
    let t = 0
    let visible = true

    const build = () => {
      const rect = cv.getBoundingClientRect()
      w = Math.max(1, rect.width)
      h = Math.max(1, rect.height)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const area = (w * h) / (440 * 520)
      const n = Math.max(2, Math.round(26 * area * (0.12 + (live.current.intensity / 100) * 2.1)))
      builtFor = live.current.intensity
      st.sim = SIMS[effect]({ w, h, n, speed: 1, a, b })
      const warm = WARM[effect as Exclude<CardEffect, 'none'>] ?? 0
      const sp0 = 0.3 + (live.current.speed / 100) * 1.7
      for (let i = 0; i < warm * 20; i++) {
        t += 0.05
        st.sim(ctx, 0.05 * sp0, t * sp0)
      }
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!visible || document.hidden) return
      // rebuild when the intensity changes enough to matter (the particle count depends on it)
      if (!st.sim || Math.abs(builtFor - live.current.intensity) >= 4) build()
      t += dt
      const sp = 0.3 + (live.current.speed / 100) * 1.7
      ctx.clearRect(0, 0, w, h)
      st.sim?.(ctx, dt * sp, t * sp)
    }

    build()
    const io = new IntersectionObserver((e) => (visible = e[0]?.isIntersecting ?? true))
    io.observe(cv)
    const ro = new ResizeObserver(() => build())
    ro.observe(cv)

    if (reduced) {
      // one still frame, after letting the simulation settle for a moment
      for (let i = 0; i < 90; i++) {
        t += 1 / 30
        ctx.clearRect(0, 0, w, h)
        st.sim?.(ctx, 1 / 30, t)
      }
    } else raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
    }
    // colours and effect rebuild the simulation; intensity and speed are read live
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect, colors[0], colors[1], reduced])

  if (effect === 'none') return null
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 size-full rounded-[inherit]" />
}
