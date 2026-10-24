'use client'

import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clapperboard,
  Download,
  ExternalLink,
  Film,
  Gauge,
  HardDrive,
  Layers,
  Loader2,
  Maximize2,
  MonitorSmartphone,
  PackageCheck,
  ScanLine,
  Settings2,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { AutoHeight } from '@/components/launch/home/waitlist'
import { IntroLogo } from '@/components/logo-intro'
import { RingButton, RingCard } from '@/components/prelaunch/ring'
import { GradientField } from '@/components/shell/gradient-field'
import { cn } from '@/lib/utils'

/*
 * Motion4K Optimizer (method.logoless.io). Takes a high resolution, high frame rate edit and makes the file TikTok and Reels treat best:
 *
 *   Spatial pass   Lanczos-4 downscale that keeps the aspect ratio, the shortest side capped at 1080 (1080x1080, 1080x1920, 1080x1350, 1920x1080)
 *   Contrast pass  unsharp=5:5:1.0:5:5:0.0, luma only, so fine detail survives the platform's re-compression
 *   Temporal pass  tmix-style blending: above 60fps, every input frame is blended into the 60fps output frame it overlaps, weighted by overlap
 *   Export pass    H.264 High Profile Level 4.2, flagged Rec.709, in an MP4
 *
 * All of it runs on this device: the file is read with Mediabunny (demuxing and muxing in the browser), frames are decoded and encoded with the
 * browser's own video codecs (WebCodecs, hardware accelerated where the device has it) and every pass is a WebGL2 shader on the GPU. Nothing is
 * uploaded: this page makes no network requests with the video. The look is the pre-launch sign-up's (beta.logoless.io): the moving gradient, the intro
 * logo, the rainbow ring panels and buttons.
 */

const EASE = [0.22, 1, 0.36, 1] as const
const MAX_BYTES = 300 * 1_000_000
const ACCEPT = '.mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/webm'
const GRAD = 'linear-gradient(90deg, rgb(var(--c-red)), rgb(var(--c-amber)), rgb(var(--c-teal)), rgb(var(--c-blue)))'
const REC709: VideoColorSpaceInit = { primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false }
const UNSHARP = 'unsharp=5:5:1.0:5:5:0.0'

const move = {
  initial: { opacity: 0, y: 18, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(8px)' },
  transition: { duration: 0.45, ease: EASE },
}

const title = 'font-display text-[clamp(2rem,7.5vw,2.7rem)] leading-[1.04] tracking-[-0.01em] text-paper'
const sub = 'mt-3 text-[15px] leading-relaxed text-paper/55'
const tile = 'rounded-[calc(18px*var(--round,1))] border border-white/10 bg-white/[0.035]'

// ------------------------------------------------------------------------------------------------------------------------------------------------
// What the file is, and what it becomes
// ------------------------------------------------------------------------------------------------------------------------------------------------

type Probe = {
  file: File
  width: number
  height: number
  fps: number
  duration: number
  codec: string
  color: string
  hdr: boolean
  audio: string | null
  decodable: boolean
}

type Plan = { width: number; height: number; fps: number; blend: boolean; ratio: number }

const COMMON_FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 72, 90, 100, 119.88, 120, 144, 180, 240]
/** Measured rates wobble (120.02, 59.9): they are shown and used as the standard rate they are within 1.5% of. */
const snapFps = (f: number) => {
  const near = COMMON_FPS.reduce((a, b) => (Math.abs(b - f) < Math.abs(a - f) ? b : a))
  return Math.abs(near - f) / near < 0.015 ? near : Math.round(f * 100) / 100
}
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)

/** The shortest side is capped at 1080 and the longest at 1920 (H.264 Level 4.2's frame size), never scaled up, the shape kept. Above 60fps the output is 60. */
function planFor(p: Pick<Probe, 'width' | 'height' | 'fps'>): Plan {
  const short = Math.min(p.width, p.height)
  const long = Math.max(p.width, p.height)
  const s = Math.min(1, 1080 / short, 1920 / long)
  const blend = p.fps > 61
  return { width: even(p.width * s), height: even(p.height * s), fps: blend ? 60 : p.fps, blend, ratio: p.fps / (blend ? 60 : p.fps) }
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
const NAMED: [number, string][] = [
  [1, '1:1 Square'],
  [9 / 16, '9:16 Vertical'],
  [16 / 9, '16:9 Landscape'],
  [4 / 5, '4:5 Portrait'],
  [5 / 4, '5:4'],
  [3 / 4, '3:4 Portrait'],
  [4 / 3, '4:3'],
  [2 / 3, '2:3 Portrait'],
  [3 / 2, '3:2'],
  [21 / 9, '21:9 Ultrawide'],
  [9 / 21, '9:21 Tall'],
]
function aspectOf(w: number, h: number) {
  const r = w / h
  const named = NAMED.find(([v]) => Math.abs(v - r) / v < 0.012)
  if (named) return named[1]
  const g = gcd(w, h)
  const word = r < 0.98 ? 'Vertical' : r > 1.02 ? 'Landscape' : 'Square'
  return w / g <= 32 && h / g <= 32 ? `${w / g}:${h / g} ${word}` : `${r.toFixed(2)}:1 ${word}`
}

const CODEC_LABEL: Record<string, string> = { avc: 'H.264', hevc: 'HEVC', vp8: 'VP8', vp9: 'VP9', av1: 'AV1', prores: 'ProRes' }
function colorOf(space: VideoColorSpaceInit): string {
  // the DOM types know only a few names; files carry more (Rec.2020, PQ, HLG, P3)
  const c = space as { primaries?: string | null; transfer?: string | null }
  const prim = c.primaries === 'bt2020' ? 'Rec.2020' : c.primaries === 'smpte170m' || c.primaries === 'bt470bg' ? 'Rec.601' : c.primaries === 'smpte432' ? 'Display P3' : 'Rec.709'
  const tf = c.transfer === 'pq' ? ' PQ' : c.transfer === 'hlg' ? ' HLG' : ''
  return prim + tf
}

const mb = (n: number) => `${(n / 1_000_000).toFixed(1)} MB`
const clock = (s: number) => {
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}
const fpsText = (f: number) => (Number.isInteger(f) ? `${f}` : f.toFixed(2).replace(/0$/, ''))

function looksLikeVideo(f: File) {
  return /^video\/(mp4|quicktime|webm|x-m4v)$/i.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name)
}

async function probeFile(file: File): Promise<Probe> {
  const M = await import('mediabunny')
  const input = new M.Input({ source: new M.BlobSource(file), formats: M.ALL_FORMATS })
  try {
    const vt = await input.getPrimaryVideoTrack()
    if (!vt) throw new Error('There is no video in this file.')
    const [width, height, codec, color, hdr, stats, duration, decodable, at] = await Promise.all([
      vt.getDisplayWidth(),
      vt.getDisplayHeight(),
      vt.getCodec(),
      vt.getColorSpace(),
      vt.hasHighDynamicRange(),
      vt.computePacketStats(360),
      input.computeDuration(),
      vt.canDecode(),
      input.getPrimaryAudioTrack(),
    ])
    let audio: string | null = null
    if (at) {
      const [ac, ch] = await Promise.all([at.getCodec(), at.getNumberOfChannels()])
      audio = `${(ac ?? 'audio').toUpperCase()} ${ch === 1 ? 'mono' : ch === 2 ? 'stereo' : `${ch} ch`}`
    }
    return {
      file,
      width,
      height,
      fps: snapFps(stats.averagePacketRate),
      duration,
      codec: codec ? (CODEC_LABEL[codec] ?? codec.toUpperCase()) : 'Unknown',
      color: colorOf(color),
      hdr,
      audio,
      decodable,
    }
  } finally {
    input.dispose()
  }
}

// ------------------------------------------------------------------------------------------------------------------------------------------------
// The GPU passes: horizontal Lanczos (with the file's rotation), vertical Lanczos into a blend buffer, then the unsharp mask to the output
// ------------------------------------------------------------------------------------------------------------------------------------------------

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

// one Lanczos-4 axis. The kernel is widened by the scale factor when shrinking, so every source pixel counts (a true area-correct downscale).
const LANCZOS = `
const float A = 4.0;
const float PI = 3.141592653589793;
float sinc(float x) { if (abs(x) < 1e-5) return 1.0; float y = PI * x; return sin(y) / y; }
float lanczos(float x) { return abs(x) < A ? sinc(x) * sinc(x / A) : 0.0; }
`

// Horizontal: reads the raw frame through its rotation, writes out-width x source-height. Rows are kept bottom-up, as the framebuffer has them.
const FRAG_H = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uSrc;
uniform ivec2 uRaw;      // the decoded frame's size, before rotation
uniform ivec2 uOrient;   // the size as it is shown (after rotation)
uniform int uRot;        // 0, 90, 180 or 270 (clockwise)
uniform float uScale;    // source width / output width
out vec4 o;
${LANCZOS}
vec4 fetchShown(ivec2 p) {
  // p is in shown, top-down pixels; turn it back into the decoded frame's pixel
  ivec2 r = p;
  if (uRot == 90) r = ivec2(p.y, uRaw.y - 1 - p.x);
  else if (uRot == 180) r = ivec2(uRaw.x - 1 - p.x, uRaw.y - 1 - p.y);
  else if (uRot == 270) r = ivec2(uRaw.x - 1 - p.y, p.x);
  return texelFetch(uSrc, clamp(r, ivec2(0), uRaw - 1), 0);
}
void main() {
  ivec2 f = ivec2(gl_FragCoord.xy);
  int row = uOrient.y - 1 - f.y;
  float s = max(uScale, 1.0);
  float c = (float(f.x) + 0.5) * uScale - 0.5;
  int j0 = int(floor(c - A * s)) + 1;
  int j1 = int(floor(c + A * s));
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  for (int j = j0; j <= j1; j++) {
    float w = lanczos((float(j) - c) / s);
    acc += w * fetchShown(ivec2(clamp(j, 0, uOrient.x - 1), row));
    wsum += w;
  }
  o = clamp(acc / wsum, 0.0, 1.0);
}`

// Vertical: reads the horizontal pass, writes the output size. Drawn with additive blending, weighted, so frames that share an output frame mix.
const FRAG_V = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uSrc;
uniform int uSrcH;
uniform float uScale;    // source height / output height
out vec4 o;
${LANCZOS}
void main() {
  ivec2 f = ivec2(gl_FragCoord.xy);
  float s = max(uScale, 1.0);
  float c = (float(f.y) + 0.5) * uScale - 0.5;
  int j0 = int(floor(c - A * s)) + 1;
  int j1 = int(floor(c + A * s));
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  for (int j = j0; j <= j1; j++) {
    float w = lanczos((float(j) - c) / s);
    acc += w * texelFetch(uSrc, ivec2(f.x, clamp(j, 0, uSrcH - 1)), 0);
    wsum += w;
  }
  o = vec4(clamp(acc.rgb / wsum, 0.0, 1.0), 1.0);
}`

// unsharp=5:5:1.0:5:5:0.0 — a 5x5 luma blur, the difference added back once (amount 1.0), chroma left alone (amount 0.0).
const FRAG_U = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uSrc;
uniform float uNorm;     // 1 / the total blend weight of this output frame
uniform float uAmount;
out vec4 o;
const vec3 Y = vec3(0.2126, 0.7152, 0.0722);
void main() {
  ivec2 f = ivec2(gl_FragCoord.xy);
  ivec2 hi = textureSize(uSrc, 0) - 1;
  vec3 rgb = texelFetch(uSrc, f, 0).rgb * uNorm;
  float blur = 0.0;
  for (int y = -2; y <= 2; y++)
    for (int x = -2; x <= 2; x++)
      blur += dot(texelFetch(uSrc, clamp(f + ivec2(x, y), ivec2(0), hi), 0).rgb, Y);
  blur = blur * uNorm / 25.0;
  float luma = dot(rgb, Y);
  o = vec4(clamp(rgb + uAmount * (luma - blur), 0.0, 1.0), 1.0);
}`

class Passes {
  readonly canvas: OffscreenCanvas | HTMLCanvasElement
  private gl: WebGL2RenderingContext
  private progH: WebGLProgram
  private progV: WebGLProgram
  private progU: WebGLProgram
  private src: WebGLTexture
  private mid?: { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number }
  private acc: { tex: WebGLTexture; fb: WebGLFramebuffer }
  private raw?: { w: number; h: number }
  private fallback?: OffscreenCanvas | HTMLCanvasElement
  private direct = true
  private weight = 0
  private readonly float: boolean

  constructor(
    readonly out: { w: number; h: number },
    private readonly shown: { w: number; h: number },
    private readonly rotation: number,
  ) {
    this.canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(out.w, out.h) : Object.assign(document.createElement('canvas'), { width: out.w, height: out.h })
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: true }) as WebGL2RenderingContext | null
    if (!gl) throw new Error('This browser has no WebGL2, which the passes need.')
    this.gl = gl
    this.float = Boolean(gl.getExtension('EXT_color_buffer_float'))
    this.progH = this.program(FRAG_H)
    this.progV = this.program(FRAG_V)
    this.progU = this.program(FRAG_U)
    this.src = this.texture()
    this.acc = this.target(out.w, out.h)
    gl.bindVertexArray(gl.createVertexArray())
  }

  private program(frag: string) {
    const gl = this.gl
    const make = (type: number, code: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, code)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader: ${gl.getShaderInfoLog(s)}`)
      return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, make(gl.VERTEX_SHADER, VERT))
    gl.attachShader(p, make(gl.FRAGMENT_SHADER, frag))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Shader: ${gl.getProgramInfoLog(p)}`)
    return p
  }

  private texture() {
    const gl = this.gl
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    for (const [k, v] of [
      [gl.TEXTURE_MIN_FILTER, gl.NEAREST],
      [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
    ])
      gl.texParameteri(gl.TEXTURE_2D, k, v)
    return t
  }

  /** A texture to draw into: half float where the device can (no banding when frames are blended), 8 bit otherwise. */
  private target(w: number, h: number) {
    const gl = this.gl
    const tex = this.texture()
    if (this.float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    const fb = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    return { tex, fb, w, h }
  }

  /** Puts the decoded frame on the GPU (straight from the decoder where the browser allows it, through a 2D canvas where it does not). */
  private upload(frame: VideoFrame) {
    const gl = this.gl
    const w = frame.displayWidth
    const h = frame.displayHeight
    this.raw = { w, h }
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.src)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    if (this.direct) {
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, frame as unknown as TexImageSource)
        return
      } catch {
        this.direct = false
      }
    }
    if (!this.fallback || this.fallback.width !== w || this.fallback.height !== h)
      this.fallback = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h })
    const ctx = this.fallback.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
    ctx.drawImage(frame, 0, 0)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.fallback as unknown as TexImageSource)
  }

  /** The spatial pass for one decoded frame: uploaded and scaled across (the result is kept until the next frame). */
  spatial(frame: VideoFrame) {
    const gl = this.gl
    this.upload(frame)
    if (!this.mid) this.mid = this.target(this.out.w, this.shown.h)
    const raw = this.raw!
    // a frame that arrives already turned (its size is the shown size) is not turned again
    const turned = (this.rotation === 90 || this.rotation === 270) && raw.w === this.shown.w && raw.h === this.shown.h && raw.w !== raw.h
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.mid.fb)
    gl.viewport(0, 0, this.out.w, this.shown.h)
    gl.disable(gl.BLEND)
    gl.useProgram(this.progH)
    gl.uniform1i(gl.getUniformLocation(this.progH, 'uSrc'), 0)
    gl.uniform2i(gl.getUniformLocation(this.progH, 'uRaw'), raw.w, raw.h)
    gl.uniform2i(gl.getUniformLocation(this.progH, 'uOrient'), this.shown.w, this.shown.h)
    gl.uniform1i(gl.getUniformLocation(this.progH, 'uRot'), turned ? 0 : this.rotation)
    gl.uniform1f(gl.getUniformLocation(this.progH, 'uScale'), this.shown.w / this.out.w)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** Starts an output frame: the blend buffer is emptied. */
  begin() {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.acc.fb)
    gl.viewport(0, 0, this.out.w, this.out.h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.weight = 0
  }

  /** The temporal pass: the last scaled frame is scaled down and added to the output frame with this weight (its share of the frame's time). */
  blend(weight: number) {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.acc.fb)
    gl.viewport(0, 0, this.out.w, this.out.h)
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.FUNC_ADD)
    gl.blendColor(0, 0, 0, weight)
    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE)
    gl.useProgram(this.progV)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.mid!.tex)
    gl.uniform1i(gl.getUniformLocation(this.progV, 'uSrc'), 1)
    gl.uniform1i(gl.getUniformLocation(this.progV, 'uSrcH'), this.shown.h)
    gl.uniform1f(gl.getUniformLocation(this.progV, 'uScale'), this.shown.h / this.out.h)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.disable(gl.BLEND)
    this.weight += weight
  }

  /** The contrast pass, drawn to the canvas the encoder reads. */
  finish() {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.out.w, this.out.h)
    gl.useProgram(this.progU)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.acc.tex)
    gl.uniform1i(gl.getUniformLocation(this.progU, 'uSrc'), 2)
    gl.uniform1f(gl.getUniformLocation(this.progU, 'uNorm'), this.weight > 0 ? 1 / this.weight : 1)
    gl.uniform1f(gl.getUniformLocation(this.progU, 'uAmount'), 1.0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.flush()
    return this.canvas
  }

  dispose() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

// ------------------------------------------------------------------------------------------------------------------------------------------------
// The whole run
// ------------------------------------------------------------------------------------------------------------------------------------------------

type StageId = 'spatial' | 'contrast' | 'temporal' | 'export'
type Live = { stages: Record<StageId, number>; overall: number; speed: number; eta: number | null; finalizing: boolean }
type Result = { url: string; name: string; bytes: number; encoder: string; seconds: number; audio: 'kept' | 'converted' | 'none' | 'dropped' }

const EMPTY: Live = { stages: { spatial: 0, contrast: 0, temporal: 0, export: 0 }, overall: 0, speed: 0, eta: null, finalizing: false }

/** H.264 High 4.2 first; older or software encoders get the closest they can do. */
const H264 = ['avc1.64002A', 'avc1.640028', 'avc1.4D402A', 'avc1.4D4028', 'avc1.42E02A', 'avc1.42E028']
function encoderLabel(codec: string) {
  const prof = codec.slice(5, 7)
  const level = parseInt(codec.slice(9, 11), 16) / 10
  return `H.264 ${prof === '64' ? 'High' : prof === '4D' ? 'Main' : 'Baseline'} ${level.toFixed(1)}`
}

const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, '0')

/**
 * Hardware encoders pick the lowest level a stream needs (a 30fps 1080p stream comes out as 4.0). Every stream that meets a level also meets every level
 * above it, so a High profile stream below 4.2 is marked 4.2: in the avcC record and in the sequence parameter set inside it. Returns the codec string
 * the file ends up with.
 */
function markLevel42(cfg: VideoDecoderConfig): VideoDecoderConfig {
  const desc = cfg.description
  if (!desc) return cfg
  const d = new Uint8Array(desc instanceof ArrayBuffer ? desc.slice(0) : new Uint8Array(desc.buffer, desc.byteOffset, desc.byteLength).slice())
  if (d.length < 12 || d[0] !== 1 || d[1] !== 0x64 || d[3] >= 0x2a) return cfg
  d[3] = 0x2a
  if ((d[5] & 0x1f) >= 1 && (d[8] & 0x1f) === 7) d[11] = 0x2a // the first SPS: 2 length bytes, the NAL header, profile, constraint flags, level
  return { ...cfg, description: d, codec: `avc1.${hex2(d[1])}${hex2(d[2])}${hex2(d[3])}` }
}

async function pickEncoder(plan: Plan) {
  // about 0.16 bits a pixel: 20 Mbps for 1080x1920 at 60fps, well above what TikTok keeps, so its own encoder starts from a clean picture
  const bitrate = Math.round(Math.min(24e6, Math.max(6e6, plan.width * plan.height * plan.fps * 0.16)))
  for (const codec of H264) {
    const config: VideoEncoderConfig = { codec, width: plan.width, height: plan.height, bitrate, framerate: plan.fps, bitrateMode: 'variable', latencyMode: 'quality', avc: { format: 'avc' } }
    try {
      if ((await VideoEncoder.isConfigSupported(config)).supported) return config
    } catch {
      /* try the next */
    }
  }
  throw new Error('This browser cannot encode H.264 at this size. Try Chrome, Edge or Safari on a computer.')
}

async function patch(p: Probe, plan: Plan, onLive: (l: Live) => void, signal: AbortSignal): Promise<Result> {
  const M = await import('mediabunny')
  const started = performance.now()
  const input = new M.Input({ source: new M.BlobSource(p.file), formats: M.ALL_FORMATS })
  const target = new M.BufferTarget()
  const output = new M.Output({ format: new M.Mp4OutputFormat({ fastStart: 'in-memory' }), target })
  let encoder: VideoEncoder | null = null
  let passes: Passes | null = null
  const stop = () => {
    if (signal.aborted) throw new DOMException('Stopped', 'AbortError')
  }

  try {
    const vt = await input.getPrimaryVideoTrack()
    if (!vt) throw new Error('There is no video in this file.')
    const rotation = await vt.getRotation()
    const config = await pickEncoder(plan)

    // the video track: our own encoder, so the profile, the level and the Rec.709 flags are exactly what we ask for
    const videoOut = new M.EncodedVideoPacketSource('avc')
    output.addVideoTrack(videoOut, p.fps > 0 && plan.blend ? { frameRate: plan.fps } : {})

    // the audio track: copied as it is when it is AAC, converted to AAC when the browser can, otherwise kept as Opus or left out
    const at = await input.getPrimaryAudioTrack()
    let audio: Result['audio'] = 'none'
    let feedAudio: (() => Promise<void>) | null = null
    if (at) {
      const codec = await at.getCodec()
      const canAac = await M.canEncodeAudio('aac').catch(() => false)
      if (codec === 'aac' || (codec === 'opus' && !canAac)) {
        const src = new M.EncodedAudioPacketSource(codec)
        output.addAudioTrack(src)
        audio = 'kept'
        feedAudio = async () => {
          const decoderConfig = await at.getDecoderConfig()
          let first = true
          for await (const packet of new M.EncodedPacketSink(at).packets()) {
            stop()
            await src.add(packet, first && decoderConfig ? { decoderConfig } : undefined)
            first = false
          }
          src.close()
        }
      } else if (canAac && (await at.canDecode())) {
        const src = new M.AudioSampleSource({ codec: 'aac', bitrate: 192_000 })
        output.addAudioTrack(src)
        audio = 'converted'
        feedAudio = async () => {
          for await (const sample of new M.AudioSampleSink(at).samples()) {
            stop()
            await src.add(sample)
            sample.close()
          }
          src.close()
        }
      } else audio = 'dropped'
    }
    await output.start()

    // packets are handed to the file in the order they come out of the encoder
    let writing: Promise<void> = Promise.resolve()
    let encodeError: unknown = null
    let encoded = 0
    let written = config.codec // the codec string the file says, once the encoder has described its stream
    encoder = new VideoEncoder({
      output: (chunk, meta) => {
        encoded++
        let m: EncodedVideoChunkMetadata | undefined = meta
        if (meta?.decoderConfig) {
          const dc = markLevel42({ ...meta.decoderConfig, colorSpace: REC709 })
          written = dc.description ? (() => {
            const d = dc.description instanceof ArrayBuffer ? new Uint8Array(dc.description) : new Uint8Array(dc.description.buffer, dc.description.byteOffset, dc.description.byteLength)
            return `avc1.${hex2(d[1])}${hex2(d[2])}${hex2(d[3])}`
          })() : dc.codec
          m = { ...meta, decoderConfig: dc }
        }
        writing = writing.then(() => videoOut.add(M.EncodedPacket.fromEncodedChunk(chunk), m))
      },
      error: (e) => {
        encodeError = e
      },
    })
    encoder.configure(config)

    const expectedIn = Math.max(1, Math.round(p.duration * p.fps))
    const expectedOut = Math.max(1, Math.round(p.duration * plan.fps))
    let scaled = 0
    let sharpened = 0
    let blended = 0
    let lastLive = 0
    const live = (force = false) => {
      const now = performance.now()
      if (!force && now - lastLive < 120) return
      lastLive = now
      const done = Math.min(1, encoded / expectedOut)
      const secs = (now - started) / 1000
      const speed = secs > 0 ? scaled / secs : 0
      onLive({
        stages: { spatial: Math.min(1, scaled / expectedIn), contrast: Math.min(1, sharpened / expectedOut), temporal: Math.min(1, blended / expectedOut), export: done },
        overall: done * 0.97,
        speed,
        eta: speed > 0 && scaled > 10 ? Math.max(0, (expectedIn - scaled) / speed) : null,
        finalizing: false,
      })
    }

    const keyEvery = Math.max(1, Math.round(plan.fps)) // a key frame every second
    let outIndex = 0
    const emit = async (timestamp: number, duration: number) => {
      const canvas = passes!.finish()
      sharpened++
      const frame = new VideoFrame(canvas, { timestamp: Math.round(timestamp * 1e6), duration: Math.round(duration * 1e6) })
      // backpressure: never more than a few frames waiting in the encoder
      while (encoder!.encodeQueueSize > 6) await new Promise<void>((r) => encoder!.addEventListener('dequeue', () => r(), { once: true }))
      if (encodeError) throw encodeError
      encoder!.encode(frame, { keyFrame: outIndex % keyEvery === 0 })
      frame.close()
      outIndex++
      live()
    }

    const feedVideo = async () => {
      const outDur = 1 / plan.fps
      let first: number | null = null
      let current = -1 // the output frame being blended
      let currentHas = false
      for await (const sample of new M.VideoSampleSink(vt).samples()) {
        try {
          stop()
          if (first === null) first = sample.timestamp
          const frame = sample.toVideoFrame()
          try {
            if (!passes) passes = new Passes({ w: plan.width, h: plan.height }, { w: p.width, h: p.height }, rotation)
            passes.spatial(frame)
          } finally {
            frame.close()
          }
          scaled++
          const t0 = sample.timestamp - first
          const d = sample.duration > 0 ? sample.duration : 1 / p.fps
          if (!plan.blend) {
            // 60fps or less: one output frame per input frame, at its own time
            passes.begin()
            passes.blend(1)
            blended++
            await emit(t0, d)
            continue
          }
          // above 60fps: the frame is split over the 60fps frames it overlaps, each part weighted by how much of that frame's time it covers
          let a = t0
          const b = t0 + d
          while (a < b - 1e-9) {
            const k = Math.floor(a / outDur + 1e-6)
            const end = Math.min(b, (k + 1) * outDur)
            if (k !== current) {
              if (currentHas) {
                blended++
                await emit(current * outDur, outDur)
              }
              current = k
              currentHas = false
              passes.begin()
            }
            passes.blend((end - a) / outDur)
            currentHas = true
            a = end
          }
        } finally {
          sample.close()
        }
      }
      if (plan.blend && currentHas && passes) {
        blended++
        await emit(current * outDur, outDur)
      }
      await encoder!.flush()
      if (encodeError) throw encodeError
      await writing
      videoOut.close()
    }

    await Promise.all([feedVideo(), feedAudio?.()])
    live(true)
    onLive({ stages: { spatial: 1, contrast: 1, temporal: 1, export: 1 }, overall: 0.98, speed: 0, eta: 0, finalizing: true })
    await output.finalize()
    const buffer = target.buffer
    if (!buffer) throw new Error('The file could not be written.')
    const name = `${p.file.name.replace(/\.[^.]+$/, '') || 'video'}-tiktok-${plan.width}x${plan.height}-${fpsText(plan.fps)}fps.mp4`
    return {
      url: URL.createObjectURL(new Blob([buffer], { type: 'video/mp4' })),
      name,
      bytes: buffer.byteLength,
      encoder: encoderLabel(written),
      seconds: (performance.now() - started) / 1000,
      audio,
    }
  } catch (e) {
    await output.cancel().catch(() => undefined)
    throw e
  } finally {
    if (encoder && encoder.state !== 'closed') encoder.close()
    ;(passes as Passes | null)?.dispose()
    input.dispose()
  }
}

function supportProblem(): string | null {
  if (typeof window === 'undefined') return null
  if (!('VideoEncoder' in window) || !('VideoDecoder' in window) || !('VideoFrame' in window))
    return 'This browser cannot process video on your device. Open this page in Chrome, Edge or Safari on a computer.'
  const c = document.createElement('canvas')
  if (!c.getContext('webgl2')) return 'This browser has WebGL2 turned off, which the passes need. Open this page in Chrome, Edge or Safari.'
  return null
}

// ------------------------------------------------------------------------------------------------------------------------------------------------
// The page
// ------------------------------------------------------------------------------------------------------------------------------------------------

type Phase = 'pick' | 'reading' | 'inspect' | 'patching' | 'done'

const STEPS: { id: 'pick' | 'inspect' | 'done'; label: string }[] = [
  { id: 'pick', label: 'Upload' },
  { id: 'inspect', label: 'Patch' },
  { id: 'done', label: 'Publish' },
]

/** Three bars, one per step, as on the sign-up: done ones are solid, the one you are on is the rainbow. */
function Progress({ at }: { at: 'pick' | 'inspect' | 'done' }) {
  const i = STEPS.findIndex((s) => s.id === at)
  return (
    <ol className="flex w-full max-w-[300px] gap-2" aria-label="Progress">
      {STEPS.map((s, k) => (
        <li key={s.id} className="flex-1" aria-current={k === i ? 'step' : undefined}>
          <span className="block h-[3px] overflow-hidden rounded-full bg-white/10">
            <motion.span className="block h-full rounded-full" style={{ background: k < i ? 'rgb(255 255 255 / 0.85)' : GRAD }} initial={false} animate={{ width: k <= i ? '100%' : '0%' }} transition={{ duration: 0.6, ease: EASE }} />
          </span>
          <span className={cn('mt-2 block text-center text-[12px] transition-colors duration-300', k === i ? 'text-paper/80' : 'text-paper/30')}>{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

function Warning({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
      <div className="mt-4 flex items-start gap-3 rounded-[calc(18px*var(--round,1))] border border-red-400/25 bg-red-500/[0.07] p-3.5 text-left">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-red-300" />
        <p className="min-w-0 flex-1 text-[14px] leading-snug text-red-100/90">{children}</p>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Dismiss" className="-m-1 grid size-7 shrink-0 place-items-center rounded-full text-red-200/60 transition-colors hover:bg-white/10 hover:text-red-100">
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function Back({ onClick, children = 'Back' }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="mx-auto mt-5 flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-paper/45 transition-colors hover:text-paper/80">
      <ArrowLeft aria-hidden="true" className="size-3.5" /> {children}
    </button>
  )
}

/** The tool's name, in the pill the sign-up uses for "Founding member". */
function Badge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-[13px] text-paper/80">
      <ShieldCheck aria-hidden="true" className="size-3.5" /> Motion4K Optimizer
    </span>
  )
}

const PLATFORMS = [
  { icon: 'tiktok', label: 'TikTok' },
  { icon: 'instagram', label: 'Reels' },
  { icon: 'youtubeshorts', label: 'Shorts' },
]

// ---- 1: the upload pill ----
function Pick({ onFile, warning, clearWarning, unsupported }: { onFile: (f: File) => void; warning: string; clearWarning: () => void; unsupported: string | null }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const take = (list: FileList | null) => {
    const f = list?.[0]
    if (f) onFile(f)
  }
  return (
    <motion.div key="pick" {...move}>
      <RingCard on>
        <Badge />
        <h1 className={cn(title, 'mt-5')}>Patch your edit for TikTok.</h1>
        <p className={sub}>Drop a 4K or high frame rate edit. It is downscaled, sharpened against compression and blended to 60fps, right here on your device.</p>
        <button
          type="button"
          disabled={Boolean(unsupported)}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            take(e.dataTransfer.files)
          }}
          className={cn(
            'group relative mt-6 flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[calc(28px*var(--round,1))] border border-dashed px-6 py-10 text-center transition-[border-color,background-color,transform] duration-300 outline-none focus-visible:border-white/40 disabled:pointer-events-none disabled:opacity-50',
            over ? 'scale-[1.01] border-white/45 bg-white/[0.08]' : 'border-white/15 bg-white/[0.035] hover:border-white/30 hover:bg-white/[0.06]',
          )}
        >
          <motion.span
            className="grid size-14 place-items-center rounded-full bg-white/10 text-paper"
            animate={over ? { y: -4, scale: 1.06 } : { y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <Upload aria-hidden="true" className="size-6" />
          </motion.span>
          <span className="text-[16px] font-medium text-paper">{over ? 'Drop it' : 'Drop your video here'}</span>
          <span className="text-[13px] text-paper/45">or click to choose · MP4, MOV or WebM · up to 300 MB</span>
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => (take(e.target.files), (e.target.value = ''))} />
        <AnimatePresence initial={false}>
          {(warning || unsupported) && <Warning onClose={warning ? clearWarning : undefined}>{warning || unsupported}</Warning>}
        </AnimatePresence>
        <ul className="mt-6 space-y-2.5 text-[14px] text-paper/70">
          {['Processed on your device, never uploaded', 'Keeps your shape: square, vertical, 4:5 or landscape', 'Takes up to 4K at 120fps'].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <Check aria-hidden="true" className="size-4 shrink-0 text-paper/45" /> {t}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex items-center justify-center gap-5 border-t border-white/[0.07] pt-5 text-[13px] text-paper/45">
          <span>Made for</span>
          {PLATFORMS.map((p) => (
            <span key={p.icon} className="flex items-center gap-1.5">
              <BrandIcon name={p.icon} className="size-4 text-paper/70" /> {p.label}
            </span>
          ))}
        </div>
      </RingCard>
    </motion.div>
  )
}

function Reading({ name }: { name: string }) {
  return (
    <motion.div key="reading" {...move}>
      <RingCard on>
        <div className="flex flex-col items-center py-6 text-center">
          <Loader2 aria-hidden="true" className="size-7 animate-spin text-paper/60" />
          <p className="mt-5 text-[16px] text-paper">Reading your video</p>
          <p className="mt-1 max-w-[30ch] truncate text-[13px] text-paper/45">{name}</p>
        </div>
      </RingCard>
    </motion.div>
  )
}

// ---- 2: the split inspector ----
function Inspector({ probe, plan, preview, onPatch, onReset, warning, clearWarning }: { probe: Probe; plan: Plan; preview: string; onPatch: () => void; onReset: () => void; warning: string; clearWarning: () => void }) {
  const [noPreview, setNoPreview] = useState(false)
  const portrait = probe.height > probe.width
  const cards = [
    { icon: Maximize2, label: 'Aspect · resolution', value: `${probe.width} × ${probe.height}`, note: aspectOf(probe.width, probe.height) },
    { icon: Gauge, label: 'Frame rate', value: `${fpsText(probe.fps)} FPS`, note: `${probe.codec} · ${probe.color}${probe.hdr ? ' (HDR)' : ''}` },
    { icon: HardDrive, label: 'File size', value: mb(probe.file.size), note: `${clock(probe.duration)}${probe.audio ? ` · ${probe.audio}` : ' · no audio'}` },
    { icon: MonitorSmartphone, label: 'Target output', value: `${plan.width} × ${plan.height}`, note: `${fpsText(plan.fps)} fps · H.264 High 4.2 · Rec.709` },
  ]
  return (
    <motion.div key="inspect" {...move} className="grid gap-5 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:items-start">
      <RingCard on className="min-w-0">
        <div className={cn('relative mx-auto overflow-hidden rounded-[calc(20px*var(--round,1))] bg-black', portrait ? 'h-[min(64vh,600px)] max-w-full' : 'w-full')} style={{ aspectRatio: `${probe.width} / ${probe.height}` }}>
          {noPreview ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                <Film aria-hidden="true" className="mx-auto size-7 text-paper/40" />
                <p className="mt-3 text-[13px] leading-relaxed text-paper/50">This browser cannot play a preview of {probe.codec}, but it can still patch it.</p>
              </div>
            </div>
          ) : (
            <video src={preview} autoPlay muted loop playsInline onError={() => setNoPreview(true)} className="absolute inset-0 size-full object-contain" />
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
            <Clapperboard aria-hidden="true" className="size-[18px] text-paper/80" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] text-paper">{probe.file.name}</span>
            <span className="block text-[13px] text-paper/45">Live preview, looping</span>
          </span>
          <button type="button" onClick={onReset} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 text-[14px] text-paper transition-colors hover:bg-white/10">
            Change
          </button>
        </div>
      </RingCard>

      <RingCard className="min-w-0">
        <h1 className={cn(title, 'text-[clamp(1.8rem,5vw,2.3rem)]')}>Your edit</h1>
        <p className={sub}>Read from the file on your device. This is what goes in, and what TikTok will get.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {cards.map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.08 * i }} className={cn(tile, 'p-4', i === 3 && 'border-white/20 bg-white/[0.06]')}>
              <span className="flex items-center gap-2 text-[12px] whitespace-nowrap text-paper/45">
                <c.icon aria-hidden="true" className="size-3.5 shrink-0" /> {c.label}
              </span>
              <span className="mt-2 block font-display text-[clamp(18px,2.1vw,22px)] leading-tight whitespace-nowrap text-paper tabular-nums">{c.value}</span>
              <span className="mt-1 block text-[12.5px] leading-snug text-paper/50">{c.note}</span>
            </motion.div>
          ))}
        </div>
        <AnimatePresence initial={false}>{warning && <Warning onClose={clearWarning}>{warning}</Warning>}</AnimatePresence>
        <div className="mt-6">
          <RingButton onClick={onPatch} disabled={!probe.decodable}>
            Patch Video for TikTok <ArrowRight aria-hidden="true" className="size-[18px]" />
          </RingButton>
        </div>
        <p className="mt-4 text-center text-[12px] leading-relaxed text-paper/35">
          {probe.decodable
            ? plan.blend
              ? `${fpsText(probe.fps)}fps is blended into 60fps, so the motion of every frame stays in the video.`
              : `Already ${fpsText(probe.fps)}fps, so every frame is kept as it is.`
            : `This browser cannot decode ${probe.codec}. Export the edit as H.264 or HEVC, or open this page in Safari.`}
        </p>
      </RingCard>
    </motion.div>
  )
}

// ---- 3: the live processing overlay ----
function Patching({ probe, plan, live, onCancel }: { probe: Probe; plan: Plan; live: Live; onCancel: () => void }) {
  const stages: { id: StageId; icon: typeof Layers; name: string; detail: string; code: string }[] = [
    { id: 'spatial', icon: Maximize2, name: 'Spatial pass', detail: `Aspect-preserving Lanczos-4 downscale, ${probe.width}×${probe.height} to ${plan.width}×${plan.height}`, code: 'lanczos a=4' },
    { id: 'contrast', icon: ScanLine, name: 'Contrast pass', detail: 'Unsharp high-pass mask on luma, so micro detail survives compression', code: UNSHARP },
    {
      id: 'temporal',
      icon: Layers,
      name: 'Temporal pass',
      detail: plan.blend ? `Sub-frame motion blending, ${fpsText(probe.fps)}fps into a native 60fps container` : `${fpsText(probe.fps)}fps is 60 or lower, so frames are kept 1:1`,
      code: plan.blend ? `tmix · ${fpsText(plan.ratio)}:1` : 'passthrough',
    },
    { id: 'export', icon: PackageCheck, name: 'Export pass', detail: 'H.264 High Profile Level 4.2, Rec.709 colour flags, MP4', code: 'avc1.64002A' },
  ]
  const pct = Math.round(live.overall * 100)
  return (
    <motion.div key="patching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-10 backdrop-blur-md">
      <motion.div {...move} className="w-full max-w-[520px]">
        <RingCard on>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className={title}>Patching.</h1>
              <p className={cn(sub, 'mt-2')}>Keep this tab open. Everything happens on this device.</p>
            </div>
            <span className="font-display text-[clamp(2.4rem,9vw,3.4rem)] leading-none text-paper tabular-nums" aria-live="polite">
              {pct}%
            </span>
          </div>
          <div className="mt-6 h-[6px] overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <motion.div className="h-full rounded-full" style={{ background: GRAD }} initial={false} animate={{ width: `${Math.max(2, pct)}%` }} transition={{ duration: 0.3, ease: 'linear' }} />
          </div>
          <p className="mt-2.5 flex justify-between text-[12px] text-paper/40 tabular-nums">
            <span>{live.finalizing ? 'Finishing the MP4' : live.speed > 0 ? `${Math.round(live.speed)} frames a second` : 'Starting the passes'}</span>
            <span>{live.finalizing ? '' : live.eta != null ? `about ${clock(live.eta)} left` : ''}</span>
          </p>
          <ol className="mt-6 space-y-2.5">
            {stages.map((s) => {
              const v = live.stages[s.id]
              const done = v >= 0.999
              const active = !done && (v > 0 || s.id === 'spatial')
              return (
                <li key={s.id} className={cn(tile, 'flex items-center gap-3 p-3.5 transition-colors duration-300', active && 'border-white/20 bg-white/[0.06]')}>
                  <span className={cn('grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-300', done ? 'bg-teal-400/15' : 'bg-white/10')}>
                    {done ? <Check aria-hidden="true" className="size-[18px] text-teal-300" /> : <s.icon aria-hidden="true" className={cn('size-[18px]', active ? 'text-paper' : 'text-paper/45')} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] text-paper">{s.name}</span>
                      <span className="text-[12px] text-paper/45 tabular-nums">{Math.round(v * 100)}%</span>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-paper/45">{s.detail}</span>
                    <code className="mt-1.5 inline-block rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-paper/55">{s.code}</code>
                  </span>
                </li>
              )
            })}
          </ol>
        </RingCard>
        <Back onClick={onCancel}>Stop</Back>
      </motion.div>
    </motion.div>
  )
}

// ---- 4: download and the publishing guide ----
function Done({ probe, plan, result, onAgain }: { probe: Probe; plan: Plan; result: Result; onAgain: () => void }) {
  const save = () => {
    const a = document.createElement('a')
    a.href = result.url
    a.download = result.name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  const guide: { icon: React.ReactNode; text: React.ReactNode }[] = [
    {
      icon: <BrandIcon name="tiktok" className="size-[18px]" />,
      text: (
        <>
          Open{' '}
          <a href="https://www.tiktok.com/tiktokstudio/upload" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-paper underline decoration-white/25 underline-offset-2 hover:decoration-white/60">
            TikTok Studio <ExternalLink aria-hidden="true" className="size-3" />
          </a>{' '}
          (tiktok.com/studio) or TikTok Web on a desktop computer.
        </>
      ),
    },
    { icon: <Upload aria-hidden="true" className="size-[18px]" />, text: <>Select the downloaded file, {result.name}.</> },
    { icon: <Settings2 aria-hidden="true" className="size-[18px]" />, text: <>Make sure “Allow HD uploads” is on before you publish.</> },
    {
      icon: (
        <span className="flex items-center gap-1">
          <BrandIcon name="apple" className="size-[15px]" />
          <BrandIcon name="android" className="size-[15px]" />
        </span>
      ),
      text: <>Watch it on a high refresh phone (iPhone ProMotion or a 120Hz Android) for peak sharpness and fluid 60fps playback.</>,
    },
  ]
  const rows = [
    { label: 'Resolution', from: `${probe.width} × ${probe.height}`, to: `${plan.width} × ${plan.height}` },
    { label: 'Frame rate', from: `${fpsText(probe.fps)} fps`, to: `${fpsText(plan.fps)} fps` },
    { label: 'Size', from: mb(probe.file.size), to: mb(result.bytes) },
  ]
  return (
    <motion.div key="done" {...move} className="space-y-5">
      <RingCard on>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-[13px] text-paper/80">
          <Check aria-hidden="true" className="size-3.5" /> Patched in {clock(result.seconds)}
        </span>
        <h1 className={cn(title, 'mt-5')}>Ready for TikTok.</h1>
        <p className={sub}>
          {result.encoder}, Rec.709.{' '}
          {result.audio === 'kept' ? 'The sound is copied as it was.' : result.audio === 'converted' ? 'The sound was converted to AAC.' : result.audio === 'dropped' ? 'This browser could not carry the sound across, so the file is silent.' : 'The edit had no sound.'}
        </p>
        <div className={cn(tile, 'mt-6 divide-y divide-white/[0.07]')}>
          {rows.map((r) => (
            <div key={r.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-[14px]">
              <span className="w-full shrink-0 text-[12px] text-paper/45 sm:w-24 sm:text-[14px]">{r.label}</span>
              <span className="flex-1 whitespace-nowrap text-paper/55 tabular-nums">{r.from}</span>
              <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-paper/30" />
              <span className="flex-1 whitespace-nowrap text-right text-paper tabular-nums">{r.to}</span>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <RingButton onClick={save}>
            <Download aria-hidden="true" className="size-[18px]" /> Download Patched Video
          </RingButton>
        </div>
      </RingCard>

      <RingCard>
        <h2 className="font-display text-[clamp(1.5rem,5vw,1.9rem)] leading-tight text-paper">Publishing guide</h2>
        <p className={cn(sub, 'mt-2')}>Upload from a computer: the phone app compresses again before it sends.</p>
        <ol className="mt-5 space-y-3">
          {guide.map((g, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.15 + 0.08 * i }} className={cn(tile, 'flex items-start gap-3 p-3.5')}>
              <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-paper/85">
                {g.icon}
                <span className="absolute -top-1 -right-1 grid size-[18px] place-items-center rounded-full bg-paper text-[10px] font-semibold text-ink">{i + 1}</span>
              </span>
              <span className="min-w-0 flex-1 pt-2 text-[14px] leading-relaxed text-paper/75">{g.text}</span>
            </motion.li>
          ))}
        </ol>
      </RingCard>
      <Back onClick={onAgain}>Patch another video</Back>
    </motion.div>
  )
}

/**
 * method.logoless.io. One card at a time, as on the pre-launch sign-up: the upload pill, the split inspector, the processing overlay on top of it, then the
 * download with the publishing guide.
 */
export function Motion4KOptimizer() {
  const [phase, setPhase] = useState<Phase>('pick')
  const [probe, setProbe] = useState<Probe | null>(null)
  const [preview, setPreview] = useState('')
  const [warning, setWarning] = useState('')
  const [live, setLive] = useState<Live>(EMPTY)
  const [result, setResult] = useState<Result | null>(null)
  const [unsupported, setUnsupported] = useState<string | null>(null)
  const [readingName, setReadingName] = useState('')
  const abort = useRef<AbortController | null>(null)
  const plan = probe ? planFor(probe) : null

  useEffect(() => setUnsupported(supportProblem()), [])

  // the preview and the result are object URLs: let them go when they are replaced
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])
  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result])

  // a page that is closed mid-run loses the work: ask first, and keep the screen awake while it runs
  useEffect(() => {
    if (phase !== 'patching') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => undefined)
    return () => {
      window.removeEventListener('beforeunload', warn)
      void lock?.release().catch(() => undefined)
    }
  }, [phase])

  const reset = useCallback(() => {
    abort.current?.abort()
    setProbe(null)
    setPreview('')
    setResult(null)
    setWarning('')
    setLive(EMPTY)
    setPhase('pick')
  }, [])

  const onFile = async (f: File) => {
    setWarning('')
    if (!looksLikeVideo(f)) return setWarning(`${f.name} is not a video this can read. Choose an MP4, MOV or WebM file.`)
    if (f.size > MAX_BYTES) return setWarning(`This file is ${mb(f.size)}. The limit is 300 MB: trim the edit or export a shorter part, then try again.`)
    setReadingName(f.name)
    setPhase('reading')
    try {
      const p = await probeFile(f)
      setProbe(p)
      setPreview(URL.createObjectURL(f))
      setPhase('inspect')
    } catch (e) {
      setPhase('pick')
      setWarning(e instanceof Error && e.message ? `We could not read that file: ${e.message}` : 'We could not read that file. Try exporting it again as MP4.')
    }
  }

  const start = async () => {
    if (!probe || !plan) return
    setWarning('')
    setLive(EMPTY)
    setPhase('patching')
    const ctl = new AbortController()
    abort.current = ctl
    try {
      const r = await patch(probe, plan, setLive, ctl.signal)
      if (ctl.signal.aborted) return URL.revokeObjectURL(r.url)
      setResult(r)
      setPhase('done')
    } catch (e) {
      if (ctl.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) {
        setPhase('inspect')
        return
      }
      setPhase('inspect')
      setWarning(e instanceof Error && e.message ? e.message : 'Something went wrong while patching. Please try again.')
    } finally {
      if (abort.current === ctl) abort.current = null
    }
  }

  const cancel = () => {
    abort.current?.abort()
    setPhase('inspect')
  }

  const step = phase === 'done' ? 'done' : phase === 'inspect' || phase === 'patching' ? 'inspect' : 'pick'
  const wide = phase === 'inspect' || phase === 'patching'

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative isolate min-h-dvh overflow-x-clip px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <GradientField />
        <div className={cn('relative z-10 mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full flex-col justify-center transition-[max-width] duration-500', wide ? 'max-w-[980px]' : 'max-w-[440px]')}>
          <header className="mb-8 flex flex-col items-center gap-7">
            <IntroLogo replay className="h-[clamp(34px,8vw,48px)]" />
            <div className="h-[30px]">{step !== 'pick' && <Progress at={step} />}</div>
          </header>
          <AutoHeight margin={72}>
            <AnimatePresence mode="wait" initial={false}>
              {phase === 'pick' ? (
                <Pick onFile={(f) => void onFile(f)} warning={warning} clearWarning={() => setWarning('')} unsupported={unsupported} />
              ) : phase === 'reading' ? (
                <Reading name={readingName} />
              ) : (phase === 'inspect' || phase === 'patching') && probe && plan ? (
                <Inspector probe={probe} plan={plan} preview={preview} onPatch={() => void start()} onReset={reset} warning={warning} clearWarning={() => setWarning('')} />
              ) : phase === 'done' && probe && plan && result ? (
                <Done probe={probe} plan={plan} result={result} onAgain={reset} />
              ) : null}
            </AnimatePresence>
          </AutoHeight>
          <footer className="mt-8 text-center text-[12px] leading-relaxed text-paper/30">
            Runs entirely in your browser: your video never leaves this device.{' '}
            <a href="https://logoless.io/legal/terms" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-paper/60">
              Terms
            </a>{' '}
            and{' '}
            <a href="https://logoless.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-paper/60">
              Privacy Policy
            </a>
            .
          </footer>
        </div>
        <AnimatePresence>{phase === 'patching' && probe && plan && <Patching probe={probe} plan={plan} live={live} onCancel={cancel} />}</AnimatePresence>
      </main>
    </MotionConfig>
  )
}
