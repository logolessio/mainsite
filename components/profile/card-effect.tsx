'use client'

import { useEffect, useRef } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import type { CardEffect } from '@/lib/profile-style'

/**
 * Particle effects for a profile card. Each one is a small simulation drawn on a canvas (depth layers, wind, turbulence,
 * glow, fading) rather than a few CSS dots, so they behave like the real thing. `intensity` and `speed` are 0 to 100.
 */

type Rgb = [number, number, number]
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const rgb = (hex: string): Rgb => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255]
}
const rgba = (c: Rgb, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a))})`
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const lift = (c: Rgb, t: number): Rgb => mix(c, [255, 255, 255], t)

/** A soft round glow, drawn once and stamped many times. */
function glowSprite(c: Rgb, size = 64) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')!
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gr.addColorStop(0, rgba(lift(c, 0.55), 1))
  gr.addColorStop(0.25, rgba(c, 0.55))
  gr.addColorStop(1, rgba(c, 0))
  g.fillStyle = gr
  g.fillRect(0, 0, size, size)
  return cv
}

type Opts = { w: number; h: number; n: number; speed: number; a: Rgb; b: Rgb }
type Sim = (ctx: CanvasRenderingContext2D, dt: number, t: number) => void

// ---------- snow: three depth layers, wind gusts, soft near flakes ----------
function snow({ w, h, n, speed }: Opts): Sim {
  const sprite = glowSprite([255, 255, 255], 48)
  const flakes = Array.from({ length: Math.round(n * 1.6) }, () => ({ x: rand(0, w), y: rand(-h, h), z: Math.pow(Math.random(), 1.6), ph: rand(0, 6.28), f: rand(0.4, 1.1) }))
  return (ctx, dt, t) => {
    const gust = Math.sin(t * 0.17) * 16 + Math.sin(t * 0.51) * 7
    for (const f of flakes) {
      const r = 0.8 + f.z * 3.4
      f.y += (16 + f.z * 62) * speed * dt
      f.x += (gust * (0.35 + f.z) + Math.sin(t * f.f + f.ph) * (5 + f.z * 14)) * speed * dt
      if (f.y > h + 8) {
        f.y = -8
        f.x = rand(0, w)
      }
      if (f.x > w + 10) f.x = -10
      if (f.x < -10) f.x = w + 10
      ctx.globalAlpha = 0.28 + f.z * 0.62
      const s = r * (f.z > 0.7 ? 5 : 3.2) // near flakes are out of focus, so they are bigger and softer
      ctx.drawImage(sprite, f.x - s, f.y - s, s * 2, s * 2)
    }
    ctx.globalAlpha = 1
  }
}

// ---------- rain: angled streaks, splashes on the ground, mist, rare lightning ----------
function rain({ w, h, n, speed }: Opts): Sim {
  const ground = h - 6
  const drops = Array.from({ length: Math.round(n * 1.9) }, () => ({ x: rand(-20, w), y: rand(-h, h), z: Math.pow(Math.random(), 1.3), gy: rand(h - 38, ground) }))
  const ripples: { x: number; y: number; r: number; max: number; z: number }[] = []
  let flash = 0
  let nextFlash = rand(9, 20)
  return (ctx, dt, t) => {
    const ang = 0.2 + Math.sin(t * 0.2) * 0.04
    const sx = Math.sin(ang)
    const cy = Math.cos(ang)
    ctx.lineCap = 'round'
    for (const d of drops) {
      const v = (520 + d.z * 520) * speed
      const len = 10 + d.z * 22
      d.x += sx * v * dt
      d.y += cy * v * dt
      if (d.y > d.gy) {
        if (ripples.length < 40 && Math.random() < 0.7) ripples.push({ x: d.x, y: d.gy, r: 0.5, max: 5 + d.z * 11, z: d.z })
        d.y = rand(-60, -4)
        d.x = rand(-20, w)
        d.gy = rand(h - 38, ground)
      }
      ctx.strokeStyle = `rgba(190,214,255,${0.14 + d.z * 0.42})`
      ctx.lineWidth = 0.6 + d.z * 0.9
      ctx.beginPath()
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x - sx * len, d.y - cy * len)
      ctx.stroke()
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const p = ripples[i]
      p.r += (22 + p.max) * speed * dt
      const k = p.r / p.max
      if (k >= 1) {
        ripples.splice(i, 1)
        continue
      }
      ctx.strokeStyle = `rgba(200,222,255,${(1 - k) * (0.18 + p.z * 0.4)})`
      ctx.lineWidth = 0.9
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.32, 0, 0, 6.283)
      ctx.stroke()
    }
    const mist = ctx.createLinearGradient(0, h * 0.62, 0, h)
    mist.addColorStop(0, 'rgba(170,195,235,0)')
    mist.addColorStop(1, 'rgba(170,195,235,0.14)')
    ctx.fillStyle = mist
    ctx.fillRect(0, h * 0.62, w, h * 0.38)
    nextFlash -= dt
    if (nextFlash < 0) {
      flash = 1
      nextFlash = rand(10, 22)
    }
    if (flash > 0) {
      ctx.fillStyle = `rgba(220,232,255,${flash * 0.1 * (0.6 + 0.4 * Math.sin(t * 60))})`
      ctx.fillRect(0, 0, w, h)
      flash -= dt * 4.5
    }
  }
}

// ---------- embers: rising sparks that cool from white to red, turbulence, heat glow ----------
function embers({ w, h, n, speed }: Opts): Sim {
  const sprite = glowSprite([255, 150, 60], 64)
  type S = { x: number; y: number; vx: number; vy: number; life: number; age: number; r: number; seed: number }
  const sparks: S[] = []
  const spawn = (): S => ({ x: rand(0, w), y: h + rand(0, 14), vx: rand(-6, 10), vy: -rand(36, 110), life: rand(2.6, 6.2), age: 0, r: rand(0.8, 3), seed: rand(0, 100) })
  for (let i = 0; i < n * 1.4; i++) sparks.push({ ...spawn(), age: rand(0, 4), y: rand(0, h) })
  const hot: Rgb = [255, 244, 190]
  const mid: Rgb = [255, 150, 50]
  const cold: Rgb = [150, 28, 8]
  return (ctx, dt, t) => {
    const heat = ctx.createLinearGradient(0, h, 0, h * 0.55)
    heat.addColorStop(0, `rgba(255,96,32,${0.2 + Math.sin(t * 3) * 0.03})`)
    heat.addColorStop(1, 'rgba(255,96,32,0)')
    ctx.fillStyle = heat
    ctx.fillRect(0, h * 0.55, w, h * 0.45)
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i]
      s.age += dt * speed
      if (s.age > s.life) {
        sparks[i] = spawn()
        continue
      }
      const k = s.age / s.life
      s.vx += (Math.sin(t * 2.1 + s.seed * 7) + Math.sin(t * 3.7 + s.seed * 3)) * 22 * dt
      s.x += s.vx * speed * dt
      s.y += s.vy * (0.55 + 0.45 * (1 - k)) * speed * dt
      const c = k < 0.3 ? mix(hot, mid, k / 0.3) : mix(mid, cold, (k - 0.3) / 0.7)
      const flick = 0.72 + 0.28 * Math.sin(t * 22 + s.seed * 11)
      const a = (1 - k * k) * flick
      const size = s.r * (1 - k * 0.65)
      ctx.globalAlpha = a * 0.9
      ctx.drawImage(sprite, s.x - size * 4, s.y - size * 4, size * 8, size * 8)
      ctx.globalAlpha = a
      ctx.fillStyle = rgba(lift(c, 0.4), 1)
      ctx.beginPath()
      ctx.arc(s.x, s.y, Math.max(0.3, size * 0.5), 0, 6.283)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ---------- glitter: short bright glints with a four-point shine ----------
function sparkle({ w, h, n, speed, a, b }: Opts): Sim {
  const glints: { x: number; y: number; age: number; life: number; size: number; rot: number; c: Rgb }[] = []
  const make = (age = 0) => ({ x: rand(8, w - 8), y: rand(8, h - 8), age, life: rand(0.9, 2.3), size: rand(5, 15), rot: rand(0, 1.57), c: Math.random() < 0.5 ? ([255, 255, 255] as Rgb) : Math.random() < 0.5 ? lift(a, 0.5) : lift(b, 0.5) })
  for (let i = 0; i < n * 0.55; i++) glints.push(make(rand(0, 2)))
  return (ctx, dt) => {
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < glints.length; i++) {
      const g = glints[i]
      g.age += dt * speed
      if (g.age > g.life) {
        glints[i] = make()
        continue
      }
      const p = g.age / g.life
      const s = Math.pow(Math.sin(Math.PI * p), 1.6) * g.size
      ctx.save()
      ctx.translate(g.x, g.y)
      ctx.rotate(g.rot + p * 0.9)
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.5)
      glow.addColorStop(0, rgba(g.c, 0.55))
      glow.addColorStop(1, rgba(g.c, 0))
      ctx.fillStyle = glow
      ctx.fillRect(-s * 1.5, -s * 1.5, s * 3, s * 3)
      ctx.fillStyle = rgba(g.c, 0.95)
      for (const [len, wid] of [[s, 0.9], [s * 0.55, 0.7]] as const) {
        ctx.beginPath()
        ctx.moveTo(0, -len)
        ctx.quadraticCurveTo(wid, -wid, len, 0)
        ctx.quadraticCurveTo(wid, wid, 0, len)
        ctx.quadraticCurveTo(-wid, wid, -len, 0)
        ctx.quadraticCurveTo(-wid, -wid, 0, -len)
        ctx.fill()
        ctx.rotate(0.785)
      }
      ctx.restore()
    }
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ---------- starfield: twinkling stars and the odd shooting star ----------
function stars({ w, h, n, speed, a, b }: Opts): Sim {
  const field = Array.from({ length: Math.round(n * 2.2) }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(0.3, 1.5), f: rand(0.6, 2.8), ph: rand(0, 6.28), c: Math.random() < 0.25 ? lift(Math.random() < 0.5 ? a : b, 0.6) : ([255, 255, 255] as Rgb) }))
  let shot: { x: number; y: number; vx: number; vy: number; age: number } | null = null
  let next = rand(2, 5)
  return (ctx, dt, t) => {
    for (const s of field) {
      const tw = 0.35 + 0.65 * Math.pow(Math.sin(t * s.f * speed + s.ph) * 0.5 + 0.5, 2)
      ctx.fillStyle = rgba(s.c, tw)
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, 6.283)
      ctx.fill()
      if (s.r > 1.1) {
        ctx.fillStyle = rgba(s.c, tw * 0.25)
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r * 2.6, 0, 6.283)
        ctx.fill()
      }
    }
    next -= dt * speed
    if (!shot && next < 0) {
      const ang = rand(0.35, 0.7)
      const v = rand(380, 560)
      shot = { x: rand(0, w * 0.7), y: rand(0, h * 0.35), vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, age: 0 }
      next = rand(3, 8)
    }
    if (shot) {
      shot.age += dt
      shot.x += shot.vx * dt
      shot.y += shot.vy * dt
      const len = 90
      const nx = shot.vx / Math.hypot(shot.vx, shot.vy)
      const ny = shot.vy / Math.hypot(shot.vx, shot.vy)
      const al = Math.max(0, 1 - shot.age / 0.9)
      const g = ctx.createLinearGradient(shot.x, shot.y, shot.x - nx * len, shot.y - ny * len)
      g.addColorStop(0, `rgba(255,255,255,${al})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.strokeStyle = g
      ctx.lineWidth = 1.6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(shot.x, shot.y)
      ctx.lineTo(shot.x - nx * len, shot.y - ny * len)
      ctx.stroke()
      if (shot.age > 0.9) shot = null
    }
  }
}

// ---------- aurora: curtains made of many thin vertical rays that shimmer and sway ----------
function aurora({ w, h, n, speed, a, b }: Opts): Sim {
  const bands = [a, mix(a, b, 0.5), b]
  const strength = Math.min(1.5, 0.5 + n / 36)
  return (ctx, _dt, t) => {
    ctx.globalCompositeOperation = 'lighter'
    const H = 100
    bands.forEach((c, k) => {
      const base = h * (0.2 + k * 0.14)
      // each ray fades from bright at its top to nothing at its foot; the gradient is drawn once in local units
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, rgba(lift(c, 0.4), 0))
      g.addColorStop(0.12, rgba(lift(c, 0.3), 1))
      g.addColorStop(0.4, rgba(c, 0.55))
      g.addColorStop(1, rgba(c, 0))
      ctx.fillStyle = g
      const step = 3
      for (let x = 0; x < w; x += step) {
        const curve = base + Math.sin(x * 0.011 + t * 0.45 * speed + k * 2.1) * h * 0.06 + Math.sin(x * 0.026 - t * 0.28 * speed + k) * h * 0.03 + Math.sin(x * 0.005 + t * 0.12 * speed) * h * 0.04
        const shimmer = Math.pow(0.5 + 0.5 * Math.sin(x * 0.045 - t * 0.9 * speed + k * 3), 2) * (0.55 + 0.45 * Math.sin(x * 0.13 + t * 1.7 + k))
        const len = h * (0.26 + 0.2 * (0.5 + 0.5 * Math.sin(x * 0.06 + t * 0.5 + k * 1.7)))
        ctx.globalAlpha = Math.min(1, shimmer * 0.55 * strength)
        ctx.save()
        ctx.translate(x, curve - h * 0.05)
        ctx.scale(1, len / H)
        ctx.fillRect(0, 0, step + 0.6, H)
        ctx.restore()
      }
    })
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ---------- fireflies: slow wandering lights that pulse ----------
function fireflies({ w, h, n, speed, a }: Opts): Sim {
  const colour = mix([220, 255, 120], a, 0.25)
  const sprite = glowSprite(colour, 64)
  const flies = Array.from({ length: Math.round(n * 0.45) }, () => ({ x: rand(0, w), y: rand(0, h), tx: rand(0, w), ty: rand(0, h), ph: rand(0, 6.28), f: rand(0.5, 1.2), s: rand(8, 18) }))
  return (ctx, dt, t) => {
    ctx.globalCompositeOperation = 'lighter'
    for (const f of flies) {
      const dx = f.tx - f.x
      const dy = f.ty - f.y
      const d = Math.hypot(dx, dy)
      if (d < 12) {
        f.tx = Math.min(w, Math.max(0, f.x + rand(-90, 90)))
        f.ty = Math.min(h, Math.max(0, f.y + rand(-90, 90)))
      } else {
        f.x += (dx / d) * 18 * speed * dt + Math.sin(t * 1.3 + f.ph) * 6 * dt
        f.y += (dy / d) * 18 * speed * dt + Math.cos(t * 1.1 + f.ph) * 6 * dt
      }
      const pulse = Math.pow(Math.max(0, Math.sin(t * f.f * speed + f.ph)), 3)
      const size = f.s * (0.7 + pulse * 0.6)
      ctx.globalAlpha = 0.12 + pulse * 0.88
      ctx.drawImage(sprite, f.x - size, f.y - size, size * 2, size * 2)
      ctx.globalAlpha = 0.25 + pulse * 0.75
      ctx.fillStyle = rgba(lift(colour, 0.7), 1)
      ctx.beginPath()
      ctx.arc(f.x, f.y, 1.4, 0, 6.283)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ---------- petals: falling blossom that tumbles and flips ----------
function petals({ w, h, n, speed }: Opts): Sim {
  const ps = Array.from({ length: Math.round(n * 0.7) }, () => ({ x: rand(0, w), y: rand(-h, h), s: rand(5, 11), rot: rand(0, 6.28), vr: rand(-1, 1), ph: rand(0, 6.28), f: rand(0.6, 1.6), vy: rand(22, 46), tone: Math.random() }))
  return (ctx, dt, t) => {
    const wind = Math.sin(t * 0.22) * 18 + 10
    for (const p of ps) {
      p.y += p.vy * speed * dt
      p.x += (wind + Math.sin(t * p.f + p.ph) * 22) * speed * dt
      p.rot += p.vr * dt * speed
      if (p.y > h + 14) {
        p.y = -14
        p.x = rand(-20, w)
      }
      if (p.x > w + 20) p.x = -20
      const flip = Math.cos(t * p.f * 1.7 + p.ph)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(Math.max(0.12, Math.abs(flip)), 1)
      const g = ctx.createLinearGradient(0, -p.s, 0, p.s)
      g.addColorStop(0, rgba(mix([255, 214, 226], [255, 255, 255], p.tone * 0.5), 0.95))
      g.addColorStop(1, rgba(mix([240, 120, 160], [255, 170, 195], p.tone), 0.95))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(0, -p.s)
      ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.6, p.s * 0.7, p.s * 0.7, 0, p.s)
      ctx.bezierCurveTo(-p.s * 0.7, p.s * 0.7, -p.s * 0.9, -p.s * 0.6, 0, -p.s)
      ctx.fill()
      ctx.restore()
    }
  }
}

// ---------- bubbles: wobbling spheres with a highlight ----------
function bubbles({ w, h, n, speed }: Opts): Sim {
  const bs = Array.from({ length: Math.round(n * 0.5) }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(3, 15), vy: rand(14, 44), ph: rand(0, 6.28), f: rand(0.6, 1.5) }))
  return (ctx, dt, t) => {
    for (const b of bs) {
      b.y -= b.vy * (0.6 + b.r / 24) * speed * dt
      b.x += Math.sin(t * b.f + b.ph) * 14 * speed * dt
      if (b.y < -b.r * 2) {
        b.y = h + b.r * 2
        b.x = rand(0, w)
      }
      const fade = Math.min(1, b.y / (h * 0.25))
      const wob = 1 + Math.sin(t * 3 + b.ph) * 0.04
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.scale(wob, 1 / wob)
      const g = ctx.createRadialGradient(-b.r * 0.3, -b.r * 0.3, b.r * 0.1, 0, 0, b.r)
      g.addColorStop(0, `rgba(255,255,255,${0.1 * fade})`)
      g.addColorStop(0.75, `rgba(190,225,255,${0.06 * fade})`)
      g.addColorStop(1, `rgba(190,225,255,${0.28 * fade})`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, b.r, 0, 6.283)
      ctx.fill()
      ctx.strokeStyle = `rgba(255,255,255,${0.34 * fade})`
      ctx.lineWidth = 0.9
      ctx.stroke()
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * fade})`
      ctx.lineWidth = Math.max(1, b.r * 0.12)
      ctx.beginPath()
      ctx.arc(0, 0, b.r * 0.66, 3.5, 4.4)
      ctx.stroke()
      ctx.restore()
    }
  }
}

export const SIMS: Record<Exclude<CardEffect, 'none'>, (o: Opts) => Sim> = { snow, rain, embers, sparkle, stars, aurora, fireflies, petals, bubbles }

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
