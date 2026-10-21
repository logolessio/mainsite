// Full-page background effects for a profile. Each is a small painter on one canvas, built for its size and run at
// up to 30 frames a second. Soft effects are worked out at a low resolution and scaled up (which also blurs them for
// free); crisp ones batch their drawing into a few paths. Colours: `c` is the effect colour, `p` and `q` are the
// person's two theme colours, `base` the background colour under it all.
import type { BgEffect } from '@/lib/profile-extras'

export type Rgb = [number, number, number]
export type BgOpts = { w: number; h: number; c: Rgb; p: Rgb; q: Rgb; base: Rgb; k: number }
export type Painter = (ctx: CanvasRenderingContext2D, t: number, dt: number) => void

const TAU = Math.PI * 2
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const rgba = (c: Rgb, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a)})`
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const hexRgb = (hex: string): Rgb => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255]
}
/** A theme colour that is too dark to glow is lifted, so every effect stays visible. */
const vivid = (c: Rgb): Rgb => {
  const l = Math.max(...c)
  return l < 90 ? mix(c, [255, 255, 255], 0.55) : c
}

/** A soft round light, drawn once and stamped. */
function sprite(c: Rgb, size: number, hard = 0.15) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')!
  const r = size / 2
  const gr = g.createRadialGradient(r, r, 0, r, r, r)
  gr.addColorStop(0, rgba(c, 1))
  gr.addColorStop(hard, rgba(c, 0.9))
  gr.addColorStop(0.6, rgba(c, 0.25))
  gr.addColorStop(1, rgba(c, 0))
  g.fillStyle = gr
  g.fillRect(0, 0, size, size)
  return cv
}

/** Low-resolution per-pixel painter, scaled up smoothly. `fn` returns [r, g, b, a] 0..255 for each cell. */
function field(w: number, h: number, scale: number, fn: (x: number, y: number, t: number, out: Uint8ClampedArray, o: number) => void): Painter {
  const cw = Math.max(24, Math.round(w / scale))
  const ch = Math.max(24, Math.round(h / scale))
  const buf = document.createElement('canvas')
  buf.width = cw
  buf.height = ch
  const bg = buf.getContext('2d')!
  const img = bg.createImageData(cw, ch)
  return (ctx, t) => {
    const d = img.data
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) fn(x / cw, y / ch, t, d, (y * cw + x) * 4)
    bg.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(buf, 0, 0, w, h)
  }
}

// ---------- wave dots: the rolling dot landscape ----------
function dots({ w, h, c, k }: BgOpts): Painter {
  const rows = Math.round(22 + 22 * k)
  const cols = Math.round(Math.min(110, w / 14) * (0.7 + 0.5 * k))
  return (ctx, t) => {
    const base = Math.min(h * 0.16, 110)
    for (let i = 0; i < rows; i++) {
      const p = i / (rows - 1)
      const y0 = h * 0.3 + h * 0.78 * Math.pow(p, 1.6)
      const scale = 0.3 + 0.7 * p
      const halfW = w * (0.34 + 0.62 * p)
      const z = i * 0.3 - t * 0.38
      const size = 0.6 + 2.3 * Math.pow(p, 1.2)
      ctx.fillStyle = rgba(c, 0.14 + 0.66 * Math.pow(p, 1.2))
      ctx.beginPath()
      for (let j = 0; j <= cols; j++) {
        const u = j / cols
        const env = Math.exp(-Math.pow((u - 0.5) * 3.2, 2))
        const n = Math.sin(u * 9 + z * 1.1) * 0.62 + Math.sin(u * 17 - z * 0.7 + 1.7) * 0.28 + Math.sin(u * 27 + z * 1.3) * 0.1
        const lift = env * scale * base * Math.pow(Math.max(0, n + 0.15), 2) * 2.1
        const x = w / 2 + (u - 0.5) * 2 * halfW
        const y = y0 - lift
        ctx.moveTo(x + size, y)
        ctx.arc(x, y, size, 0, TAU)
      }
      ctx.fill()
    }
  }
}

// ---------- aurora: curtains of light, worked out per pixel at low resolution ----------
const plain = (c: Rgb) => Math.max(...c) - Math.min(...c) < 36

/** The person's colours, or a pleasant set of three when they kept the plain white and grey defaults. */
const trio = (c: Rgb, p: Rgb, q: Rgb): [Rgb, Rgb, Rgb] => (plain(p) && plain(q) ? [plain(c) ? [150, 160, 255] : vivid(c), [255, 96, 170], [60, 214, 200]] : [vivid(c), vivid(p), vivid(q)])

function aurora({ w, h, c, p, q, k }: BgOpts): Painter {
  // white or grey theme colours get the real thing: green, with violet and teal edges
  const cols: Rgb[] = plain(c) && plain(p) ? [[70, 255, 160], [110, 120, 255], [40, 210, 230]] : [vivid(c), vivid(p), vivid(q)]
  const gain = 0.55 + k * 0.7
  return field(w, h, 8, (x, y, t, d, o) => {
    let r = 0
    let g = 0
    let b = 0
    for (let i = 0; i < 3; i++) {
      const centre = 0.26 + i * 0.12 + Math.sin(x * (2.2 + i * 0.7) + t * (0.16 + i * 0.05) + i * 2) * 0.09 + Math.sin(x * 6.5 - t * 0.33 + i) * 0.025
      const dist = y - centre
      // a soft lower edge and a long fade upwards, like a real curtain
      const v = dist > 0 ? Math.exp(-dist * dist * 260) : Math.exp(-dist * dist * 22)
      const rays = 0.78 + 0.22 * Math.sin(x * 46 + Math.sin(x * 5 + t * 0.5) * 3 + i * 1.3)
      const s = v * rays * gain * (0.5 + 0.5 * Math.sin(x * 2.3 + t * 0.21 + i * 1.7))
      r += cols[i][0] * s
      g += cols[i][1] * s
      b += cols[i][2] * s
    }
    d[o] = r
    d[o + 1] = g
    d[o + 2] = b
    d[o + 3] = Math.min(255, Math.max(r, g, b))
  })
}

// ---------- warp starfield: flying forward through stars ----------
function warp({ w, h, c, k }: BgOpts): Painter {
  const count = Math.round(140 + 360 * k)
  const stars = Array.from({ length: count }, () => ({ x: rand(-1, 1), y: rand(-1, 1), z: rand(0.05, 1), pz: 0 }))
  const tint = mix(vivid(c), [255, 255, 255], 0.5)
  return (ctx, _t, dt) => {
    const cx = w / 2
    const cy = h / 2
    const f = Math.max(w, h) * 0.5
    ctx.lineCap = 'round'
    const groups: [number, number, number, number][][] = [[], [], []]
    for (const s of stars) {
      s.pz = s.z
      s.z -= dt * 0.22
      if (s.z <= 0.02) {
        s.x = rand(-1, 1)
        s.y = rand(-1, 1)
        s.z = 1
        s.pz = 1
        continue
      }
      const x = cx + (s.x / s.z) * f
      const y = cy + (s.y / s.z) * f
      const px = cx + (s.x / s.pz) * f
      const py = cy + (s.y / s.pz) * f
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) {
        s.z = 0
        continue
      }
      groups[s.z < 0.25 ? 0 : s.z < 0.6 ? 1 : 2].push([px, py, x, y])
    }
    groups.forEach((g, i) => {
      ctx.strokeStyle = rgba(tint, [0.95, 0.6, 0.3][i])
      ctx.lineWidth = [2, 1.3, 0.8][i]
      ctx.beginPath()
      for (const [a, b, x, y] of g) {
        ctx.moveTo(a, b)
        ctx.lineTo(x + 0.01, y)
      }
      ctx.stroke()
    })
  }
}

// ---------- synthwave: a neon grid running to the horizon under a striped sun ----------
function synth({ w, h, c, p, q, k }: BgOpts): Painter {
  const line = vivid(c)
  const sunA = vivid(p)
  const sunB = vivid(q)
  const horizon = h * 0.56
  return (ctx, t) => {
    // the sun
    const r = Math.min(w, h) * 0.2
    const sx = w / 2
    const sy = horizon - r * 0.35
    const sg = ctx.createLinearGradient(0, sy - r, 0, sy + r)
    sg.addColorStop(0, rgba(sunA, 0.95))
    sg.addColorStop(1, rgba(sunB, 0.85))
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, w, horizon)
    ctx.clip()
    const glow = ctx.createRadialGradient(sx, sy, r * 0.6, sx, sy, r * 2.4)
    glow.addColorStop(0, rgba(sunA, 0.25 * (0.5 + k)))
    glow.addColorStop(1, rgba(sunA, 0))
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, horizon)
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, TAU)
    ctx.fill()
    // the stripes cut through the lower half of the sun
    ctx.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 7; i++) {
      const yy = sy + r * (0.05 + i * 0.14) + ((t * 6) % (r * 0.14))
      ctx.fillRect(sx - r, yy, r * 2, 2 + i * 1.3)
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.restore()
    // the floor
    const floor = ctx.createLinearGradient(0, horizon, 0, h)
    floor.addColorStop(0, rgba(line, 0.08))
    floor.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = floor
    ctx.fillRect(0, horizon, w, h - horizon)
    ctx.strokeStyle = rgba(line, 0.55 + 0.3 * k)
    ctx.lineWidth = 1.2
    ctx.shadowColor = rgba(line, 0.9)
    ctx.shadowBlur = 8
    ctx.beginPath()
    const vx = w / 2
    for (let i = -14; i <= 14; i++) {
      ctx.moveTo(vx + i * w * 0.012, horizon)
      ctx.lineTo(vx + i * w * 0.16, h)
    }
    const off = (t * 0.6) % 1
    for (let i = 0; i < 14; i++) {
      const z = (i + 1 - off) / 14
      const y = horizon + (h - horizon) * Math.pow(z, 2.2)
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.strokeStyle = rgba(line, 0.9)
    ctx.beginPath()
    ctx.moveTo(0, horizon)
    ctx.lineTo(w, horizon)
    ctx.stroke()
  }
}

// ---------- mesh: soft colour drifting like a lava lamp ----------
function mesh({ w, h, c, p, q, base, k }: BgOpts): Painter {
  const [t1, t2, t3] = trio(c, p, q)
  const cols: Rgb[] = [t2, t3, t1, mix(t2, t3, 0.5)]
  const blobs = cols.map((col, i) => ({ col, ph: i * 1.7, sx: rand(0.11, 0.2), sy: rand(0.09, 0.17) }))
  const strength = 0.45 + k * 0.55
  return field(w, h, 10, (x, y, t, d, o) => {
    let r = base[0]
    let g = base[1]
    let b = base[2]
    for (const bl of blobs) {
      const bx = 0.5 + Math.sin(t * bl.sx + bl.ph) * 0.38
      const by = 0.5 + Math.cos(t * bl.sy + bl.ph * 1.3) * 0.36
      const dx = (x - bx) * (w / h)
      const dy = y - by
      const v = Math.exp(-(dx * dx + dy * dy) * 4.2) * strength
      r += (bl.col[0] - r) * v
      g += (bl.col[1] - g) * v
      b += (bl.col[2] - b) * v
    }
    d[o] = r
    d[o + 1] = g
    d[o + 2] = b
    d[o + 3] = 255
  })
}

// ---------- constellation: drifting points joined by fine threads ----------
function constellation({ w, h, c, k }: BgOpts): Painter {
  const count = Math.round(Math.min(150, (w * h) / 14000) * (0.5 + k))
  const pts = Array.from({ length: count }, () => ({ x: rand(0, w), y: rand(0, h), vx: rand(-9, 9), vy: rand(-9, 9), r: rand(0.8, 2) }))
  const reach = Math.min(170, Math.max(110, Math.sqrt((w * h) / count) * 1.4))
  const col = vivid(c)
  const LEVELS = 5
  return (ctx, _t, dt) => {
    for (const p of pts) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.x < -20) p.x = w + 20
      if (p.x > w + 20) p.x = -20
      if (p.y < -20) p.y = h + 20
      if (p.y > h + 20) p.y = -20
    }
    // lines sorted into a few brightness levels, one stroke each
    const lv: number[][] = Array.from({ length: LEVELS }, () => [])
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x
        const dy = pts[i].y - pts[j].y
        const d2 = dx * dx + dy * dy
        if (d2 > reach * reach) continue
        const s = 1 - Math.sqrt(d2) / reach
        lv[Math.min(LEVELS - 1, Math.floor(s * LEVELS))].push(i, j)
      }
    }
    ctx.lineWidth = 0.8
    lv.forEach((list, l) => {
      if (!list.length) return
      ctx.strokeStyle = rgba(col, ((l + 1) / LEVELS) * 0.45)
      ctx.beginPath()
      for (let n = 0; n < list.length; n += 2) {
        ctx.moveTo(pts[list[n]].x, pts[list[n]].y)
        ctx.lineTo(pts[list[n + 1]].x, pts[list[n + 1]].y)
      }
      ctx.stroke()
    })
    ctx.fillStyle = rgba(col, 0.9)
    ctx.beginPath()
    for (const p of pts) {
      ctx.moveTo(p.x + p.r, p.y)
      ctx.arc(p.x, p.y, p.r, 0, TAU)
    }
    ctx.fill()
  }
}

// ---------- silk: many fine lines flowing together like a sheet of fabric ----------
function silk({ w, h, c, p, q, k }: BgOpts): Painter {
  const lines = Math.round(26 + 34 * k)
  const [a, b2, b3] = trio(c, p, q)
  const b = mix(b2, b3, 0.5)
  return (ctx, t) => {
    ctx.lineWidth = 1
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < lines; i++) {
      const f = i / lines
      ctx.strokeStyle = rgba(mix(a, b, f), 0.1 + 0.18 * Math.sin(f * Math.PI))
      ctx.beginPath()
      for (let x = -20; x <= w + 20; x += 14) {
        const u = x / w
        const y =
          h * 0.5 +
          Math.sin(u * 3.1 + t * 0.35 + f * 2.4) * h * 0.16 +
          Math.sin(u * 7.3 - t * 0.22 + f * 5.1) * h * 0.05 +
          (f - 0.5) * h * 0.34 * (0.6 + 0.4 * Math.sin(u * 2 + t * 0.15))
        if (x === -20) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ---------- bokeh: big soft lights drifting out of focus ----------
function bokeh({ w, h, c, p, q, k }: BgOpts): Painter {
  const cols = trio(c, p, q)
  const sprites = cols.map((col) => sprite(col, 128, 0.55))
  const count = Math.round(16 + 26 * k)
  const lights = Array.from({ length: count }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(18, Math.min(110, w * 0.09)), s: Math.floor(Math.random() * 3), ph: rand(0, TAU), vx: rand(-6, 6), vy: rand(-10, -2) }))
  return (ctx, t, dt) => {
    ctx.globalCompositeOperation = 'lighter'
    for (const l of lights) {
      l.x += l.vx * dt
      l.y += l.vy * dt
      if (l.y < -l.r) {
        l.y = h + l.r
        l.x = rand(0, w)
      }
      if (l.x < -l.r) l.x = w + l.r
      if (l.x > w + l.r) l.x = -l.r
      ctx.globalAlpha = 0.16 + 0.12 * Math.sin(t * 0.7 + l.ph)
      ctx.drawImage(sprites[l.s], l.x - l.r, l.y - l.r, l.r * 2, l.r * 2)
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }
}

// ---------- rain code: columns of falling characters ----------
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:.=*+-<>'
function matrix({ w, h, c, k }: BgOpts): Painter {
  const size = 15
  const cols = Math.ceil(w / size)
  const col = vivid(c)
  const drops = Array.from({ length: cols }, () => ({ y: rand(-h, h), v: rand(60, 160), on: Math.random() < 0.35 + 0.5 * k, trail: Math.round(rand(8, 22)) }))
  const pick = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
  const grid: string[][] = Array.from({ length: cols }, () => Array.from({ length: Math.ceil(h / size) + 1 }, pick))
  return (ctx, _t, dt) => {
    ctx.font = `${size - 2}px ui-monospace, Menlo, monospace`
    ctx.textBaseline = 'top'
    for (let i = 0; i < cols; i++) {
      const d = drops[i]
      if (!d.on) continue
      d.y += d.v * dt
      if (d.y - d.trail * size > h) {
        d.y = rand(-h * 0.5, 0)
        d.v = rand(60, 160)
      }
      const head = Math.floor(d.y / size)
      for (let j = 0; j < d.trail; j++) {
        const row = head - j
        if (row < 0 || row * size > h) continue
        if (Math.random() < 0.02) grid[i][row] = pick()
        ctx.fillStyle = j === 0 ? 'rgba(235,255,240,0.95)' : rgba(col, (1 - j / d.trail) * 0.7)
        ctx.fillText(grid[i][row], i * size, row * size)
      }
    }
  }
}

export const BG_PAINTERS: Record<BgEffect, (o: BgOpts) => Painter> = { dots, aurora, warp, synth, mesh, constellation, silk, bokeh, matrix }
