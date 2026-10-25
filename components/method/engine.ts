/*
 * Motion4K Optimizer's engine (method.logoless.io): reads an edit, runs the passes on the GPU and writes a TikTok-ready MP4, all in the browser.
 *
 *   Spatial pass   Lanczos-4 downscale that keeps the aspect ratio, the shortest side capped at 1080 (1080x1080, 1080x1920, 1080x1350, 1920x1080)
 *   Temporal pass  to a real 60fps: above 60, input frames are blended into the 60fps frame they overlap (tmix); below 55, in-between frames are made
 *                  by motion-compensated interpolation (block matching on a two-level pyramid, a smoothed motion field, both frames warped to the
 *                  in-between time, a plain crossfade where the match is not trusted); at about 60 the frames are kept as they are
 *   Clean-up pass  a light edge-preserving denoise and a deband, so TikTok's encoder spends its bits on detail, not on grain and banding
 *   Contrast pass  unsharp=5:5:1.0:5:5:0.0 on luma, then a fine dither as the frame goes to 8 bits
 *   Export pass    H.264 High Profile Level 4.2 or HEVC Main, flagged Rec.709, in an MP4; AAC copied, other sound converted
 *   Delivery pass  optional frame-count patch (frame-count-patch.ts). Off by default: TikTok has been seen to hide posts made with it
 *
 * Mediabunny reads and writes the file, WebCodecs decodes and encodes (hardware where the device has it), WebGL2 runs every pass. Nothing is uploaded.
 */

import { DEFAULT_MULTIPLIER, patchFrameCount } from './frame-count-patch'

export const REC709: VideoColorSpaceInit = { primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false }
export const UNSHARP = 'unsharp=5:5:1.0:5:5:0.0'

export type Probe = {
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

export type Mode = 'blend' | 'interp' | 'pass'
export type Plan = { width: number; height: number; fps: number; mode: Mode; ratio: number }
export type Codec = 'avc' | 'hevc'
export type Options = { interpolate: boolean; cleanup: boolean; codec: Codec; deliveryPatch: boolean; bitrate?: number }
export type StageId = 'spatial' | 'temporal' | 'cleanup' | 'contrast' | 'export' | 'delivery'
export type Live = { stages: Record<StageId, number>; overall: number; speed: number; eta: number | null; finalizing: boolean }
export type Result = {
  url: string
  name: string
  bytes: number
  encoder: string
  seconds: number
  audio: 'kept' | 'converted' | 'none' | 'dropped'
  delivery: { real: number; declared: number } | null
  deliveryError: string | null
}

export const EMPTY_LIVE: Live = { stages: { spatial: 0, temporal: 0, cleanup: 0, contrast: 0, export: 0, delivery: 0 }, overall: 0, speed: 0, eta: null, finalizing: false }

// ------------------------------------------------------------------------------------------------------------------------------------------------
// What the file is, and what it becomes
// ------------------------------------------------------------------------------------------------------------------------------------------------

const COMMON_FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 72, 90, 100, 119.88, 120, 144, 180, 240]
/** Measured rates wobble (120.02, 59.9): they are shown and used as the standard rate they are within 1.5% of. */
export const snapFps = (f: number) => {
  const near = COMMON_FPS.reduce((a, b) => (Math.abs(b - f) < Math.abs(a - f) ? b : a))
  return Math.abs(near - f) / near < 0.015 ? near : Math.round(f * 100) / 100
}
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)
export const fpsText = (f: number) => (Number.isInteger(f) ? `${f}` : f.toFixed(2).replace(/0$/, ''))

/**
 * The shortest side is capped at 1080 and the longest at 1920 (H.264 Level 4.2's frame size), never scaled up, the shape kept. The output is 60fps:
 * blended down from above, interpolated up from below 55 (when asked), and left alone around 60.
 */
export function planFor(p: Pick<Probe, 'width' | 'height' | 'fps'>, interpolate: boolean): Plan {
  const short = Math.min(p.width, p.height)
  const long = Math.max(p.width, p.height)
  const s = Math.min(1, 1080 / short, 1920 / long)
  const mode: Mode = p.fps > 61 ? 'blend' : interpolate && p.fps < 55 ? 'interp' : 'pass'
  const fps = mode === 'pass' ? p.fps : 60
  return { width: even(p.width * s), height: even(p.height * s), fps, mode, ratio: p.fps / fps }
}

/** About 0.16 bits a pixel for H.264 (20 Mbps for 1080x1920 at 60fps), about 0.7 of that for HEVC: well above what TikTok keeps, so its encoder starts clean. */
export function defaultBitrate(plan: Plan, codec: Codec) {
  const b = plan.width * plan.height * plan.fps * 0.16 * (codec === 'hevc' ? 0.7 : 1)
  return Math.round(Math.min(28e6, Math.max(5e6, b)))
}

function colorOf(space: VideoColorSpaceInit): string {
  // the DOM types know only a few names; files carry more (Rec.2020, PQ, HLG, P3)
  const c = space as { primaries?: string | null; transfer?: string | null }
  const prim = c.primaries === 'bt2020' ? 'Rec.2020' : c.primaries === 'smpte170m' || c.primaries === 'bt470bg' ? 'Rec.601' : c.primaries === 'smpte432' ? 'Display P3' : 'Rec.709'
  const tf = c.transfer === 'pq' ? ' PQ' : c.transfer === 'hlg' ? ' HLG' : ''
  return prim + tf
}
const CODEC_LABEL: Record<string, string> = { avc: 'H.264', hevc: 'HEVC', vp8: 'VP8', vp9: 'VP9', av1: 'AV1', prores: 'ProRes' }

export async function probeFile(file: File): Promise<Probe> {
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
    return { file, width, height, fps: snapFps(stats.averagePacketRate), duration, codec: codec ? (CODEC_LABEL[codec] ?? codec.toUpperCase()) : 'Unknown', color: colorOf(color), hdr, audio, decodable }
  } finally {
    input.dispose()
  }
}

/** Whether this browser can encode HEVC at 1080p60 (Safari and Chrome on most Macs and Windows PCs with a GPU can). */
export async function canEncodeHevc() {
  if (typeof VideoEncoder === 'undefined') return false
  for (const codec of HEVC) {
    try {
      if ((await VideoEncoder.isConfigSupported({ codec, width: 1080, height: 1920, bitrate: 14e6, framerate: 60 })).supported) return true
    } catch {
      /* next */
    }
  }
  return false
}

export function supportProblem(): string | null {
  if (typeof window === 'undefined') return null
  if (!('VideoEncoder' in window) || !('VideoDecoder' in window) || !('VideoFrame' in window))
    return 'This browser cannot process video on your device. Open this page in Chrome, Edge or Safari on a computer.'
  const c = document.createElement('canvas')
  if (!c.getContext('webgl2')) return 'This browser has WebGL2 turned off, which the passes need. Open this page in Chrome, Edge or Safari.'
  return null
}

// ------------------------------------------------------------------------------------------------------------------------------------------------
// The GPU passes
// ------------------------------------------------------------------------------------------------------------------------------------------------

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`
const HEAD = `#version 300 es
precision highp float;
precision highp int;
out vec4 o;
const vec3 Y = vec3(0.2126, 0.7152, 0.0722);
float hash(vec2 p, float s) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + s * 7.13) * 43758.5453); }
`
// one Lanczos-4 axis. The kernel is widened by the scale factor when shrinking, so every source pixel counts (an area-correct downscale).
const LANCZOS = `
const float A = 4.0;
const float PI = 3.141592653589793;
float sinc(float x) { if (abs(x) < 1e-5) return 1.0; float y = PI * x; return sin(y) / y; }
float lanczos(float x) { return abs(x) < A ? sinc(x) * sinc(x / A) : 0.0; }
`

// Horizontal: reads the raw frame through its rotation, writes out-width x source-height. Rows are kept bottom-up, as the framebuffer has them.
const FRAG_H = `${HEAD}${LANCZOS}
uniform sampler2D uSrc;
uniform ivec2 uRaw;      // the decoded frame's size, before rotation
uniform ivec2 uOrient;   // the size as it is shown (after rotation)
uniform int uRot;        // 0, 90, 180 or 270 (clockwise)
uniform float uScale;    // source width / output width
vec4 fetchShown(ivec2 p) {
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

// Vertical: reads the horizontal pass, writes one finished, scaled frame.
const FRAG_V = `${HEAD}${LANCZOS}
uniform sampler2D uSrc;
uniform int uSrcH;
uniform float uScale;    // source height / output height
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

// A scaled frame added to the output frame (drawn with additive blending, weighted by the blend constant).
const FRAG_COPY = `${HEAD}
uniform sampler2D uSrc;
void main() { o = texelFetch(uSrc, ivec2(gl_FragCoord.xy), 0); }`

// Luma, averaged down by `uStep` in each direction: the pyramid the motion search runs on.
const FRAG_DOWN = `${HEAD}
uniform sampler2D uSrc;
uniform int uStep;
uniform int uLuma;       // 1: the source is colour (take its luma); 0: it is already luma (in .r)
void main() {
  ivec2 base = ivec2(gl_FragCoord.xy) * uStep;
  ivec2 hi = textureSize(uSrc, 0) - 1;
  float s = 0.0;
  for (int y = 0; y < uStep; y++)
    for (int x = 0; x < uStep; x++) {
      vec4 t = texelFetch(uSrc, min(base + ivec2(x, y), hi), 0);
      s += uLuma == 1 ? dot(t.rgb, Y) : t.r;
    }
  o = vec4(s / float(uStep * uStep), 0.0, 0.0, 1.0);
}`

// Block matching. One fragment per 16x16 block of the output. Finds where the block of the earlier frame went in the later one: a full search on the
// 1/8 level, refined on the 1/4 level around twice the coarse answer. The cost has a small pull towards no motion, so flat areas do not wander.
// Writes the motion in output pixels (xy) and how good the best match is against standing still (z, 0 = no better, 1 = far better).
const FRAG_SEARCH = `${HEAD}
uniform sampler2D uA;    // the earlier frame's level
uniform sampler2D uB;    // the later frame's level
uniform sampler2D uPrior;// the coarse motion (only when refining)
uniform int uLevel;      // 8 (coarse) or 4 (fine): output pixels per level pixel
uniform int uRadius;     // search radius in level pixels
uniform int uRefine;     // 0: full search from zero, 1: refine the prior
float sad(ivec2 p, ivec2 d, ivec2 hi, int half_) {
  float s = 0.0;
  for (int y = -half_; y < half_; y++)
    for (int x = -half_; x < half_; x++) {
      ivec2 q = p + ivec2(x, y);
      s += abs(texelFetch(uA, clamp(q, ivec2(0), hi), 0).r - texelFetch(uB, clamp(q + d, ivec2(0), hi), 0).r);
    }
  return s / float(4 * half_ * half_);
}
void main() {
  ivec2 blk = ivec2(gl_FragCoord.xy);
  int per = 16 / uLevel;                          // level pixels per block
  ivec2 p = blk * per + ivec2(per / 2);           // block centre on this level
  ivec2 hi = textureSize(uA, 0) - 1;
  int half_ = max(2, per);                        // compare a window twice the block, for a steadier match
  ivec2 c0 = ivec2(0);
  if (uRefine == 1) c0 = ivec2(round(texelFetch(uPrior, blk, 0).xy / float(uLevel)));
  float still = sad(p, ivec2(0), hi, half_);
  float best = 1e9;
  ivec2 bd = c0;
  for (int y = -uRadius; y <= uRadius; y++)
    for (int x = -uRadius; x <= uRadius; x++) {
      ivec2 d = c0 + ivec2(x, y);
      float cost = sad(p, d, hi, half_) + 0.0006 * length(vec2(d) * float(uLevel));
      if (cost < best) { best = cost; bd = d; }
    }
  float gain = still > 1e-4 ? clamp((still - best) / still, 0.0, 1.0) : 0.0;
  o = vec4(vec2(bd) * float(uLevel), gain, 1.0);
}`

// A 3x3 median of the motion field (each component), so single blocks that matched the wrong thing are pulled back into line.
const FRAG_MEDIAN = `${HEAD}
uniform sampler2D uSrc;
float med9(float v[9]) {
  for (int i = 0; i < 9; i++)
    for (int j = i + 1; j < 9; j++)
      if (v[j] < v[i]) { float t = v[i]; v[i] = v[j]; v[j] = t; }
  return v[4];
}
void main() {
  ivec2 f = ivec2(gl_FragCoord.xy);
  ivec2 hi = textureSize(uSrc, 0) - 1;
  float xs[9]; float ys[9]; float gs[9];
  int k = 0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec4 t = texelFetch(uSrc, clamp(f + ivec2(x, y), ivec2(0), hi), 0);
      xs[k] = t.x; ys[k] = t.y; gs[k] = t.z; k++;
    }
  o = vec4(med9(xs), med9(ys), med9(gs), 1.0);
}`

// The in-between frame at time uT (0 = the earlier frame, 1 = the later one). The motion at this pixel is read from the smoothed field; the earlier
// frame is pulled forward along it and the later one back, and the two are mixed by time. Where the two warped pictures disagree (something appeared
// or disappeared) or the match was weak, it falls back to a plain crossfade, which never tears.
const FRAG_INTERP = `${HEAD}
uniform sampler2D uA;
uniform sampler2D uB;
uniform sampler2D uField;
uniform float uT;
void main() {
  vec2 size = vec2(textureSize(uA, 0));
  vec2 x = gl_FragCoord.xy;
  vec4 fld = texture(uField, x / size);
  vec2 v = fld.xy;
  vec3 a = texture(uA, (x - uT * v) / size).rgb;
  vec3 b = texture(uB, (x + (1.0 - uT) * v) / size).rgb;
  vec3 warped = mix(a, b, uT);
  vec3 plain = mix(texture(uA, x / size).rgb, texture(uB, x / size).rgb, uT);
  float agree = 1.0 - smoothstep(0.06, 0.2, abs(dot(a - b, Y)));
  float trust = agree * smoothstep(0.05, 0.25, fld.z);
  bool still = dot(v, v) < 0.25;
  o = vec4(still ? plain : mix(plain, warped, trust), 1.0);
}`

// Clean-up: a light bilateral denoise (5x5, edges kept), then a deband: where four samples a little way off all sit within a hair of this pixel,
// it is a smooth gradient and takes their average, which removes the steps. Reads the output frame (with its blend weight undone).
const FRAG_CLEAN = `${HEAD}
uniform sampler2D uSrc;
uniform float uNorm;
uniform float uSeed;
void main() {
  ivec2 f = ivec2(gl_FragCoord.xy);
  ivec2 hi = textureSize(uSrc, 0) - 1;
  vec3 c = texelFetch(uSrc, f, 0).rgb * uNorm;
  float lc = dot(c, Y);
  vec3 sum = vec3(0.0);
  float wsum = 0.0;
  for (int y = -2; y <= 2; y++)
    for (int x = -2; x <= 2; x++) {
      vec3 s = texelFetch(uSrc, clamp(f + ivec2(x, y), ivec2(0), hi), 0).rgb * uNorm;
      float dl = dot(s, Y) - lc;
      float w = exp(-float(x * x + y * y) / 4.5) * exp(-(dl * dl) / 0.0008);
      sum += s * w;
      wsum += w;
    }
  vec3 d = mix(c, sum / wsum, 0.6);
  float ang = hash(vec2(f), uSeed) * 6.2831853;
  float r = 6.0 + 10.0 * hash(vec2(f.yx), uSeed + 1.0);
  vec2 off = vec2(cos(ang), sin(ang)) * r;
  vec3 s1 = texelFetch(uSrc, clamp(f + ivec2(off), ivec2(0), hi), 0).rgb * uNorm;
  vec3 s2 = texelFetch(uSrc, clamp(f - ivec2(off), ivec2(0), hi), 0).rgb * uNorm;
  vec3 s3 = texelFetch(uSrc, clamp(f + ivec2(-off.y, off.x), ivec2(0), hi), 0).rgb * uNorm;
  vec3 s4 = texelFetch(uSrc, clamp(f + ivec2(off.y, -off.x), ivec2(0), hi), 0).rgb * uNorm;
  vec3 avg = (s1 + s2 + s3 + s4) * 0.25;
  vec3 dev = max(max(abs(s1 - d), abs(s2 - d)), max(abs(s3 - d), abs(s4 - d)));
  bool smooth_ = all(lessThan(dev, vec3(0.012)));
  o = vec4(smooth_ ? mix(d, avg, 0.85) : d, 1.0);
}`

// unsharp=5:5:1.0:5:5:0.0: a 5x5 luma blur, the difference added back once (amount 1.0), chroma left alone. Then a triangular dither of one 8-bit
// step, so gradients that were smooth in the 16-bit working buffers do not band when the frame is written out at 8 bits.
const FRAG_U = `${HEAD}
uniform sampler2D uSrc;
uniform float uNorm;
uniform float uAmount;
uniform float uSeed;
void main() {
  ivec2 f = ivec2(gl_FragCoord.xy);
  ivec2 hi = textureSize(uSrc, 0) - 1;
  vec3 rgb = texelFetch(uSrc, f, 0).rgb * uNorm;
  float blur = 0.0;
  for (int y = -2; y <= 2; y++)
    for (int x = -2; x <= 2; x++)
      blur += dot(texelFetch(uSrc, clamp(f + ivec2(x, y), ivec2(0), hi), 0).rgb, Y);
  blur = blur * uNorm / 25.0;
  vec3 c = rgb + uAmount * (dot(rgb, Y) - blur);
  float n = hash(vec2(f), uSeed) + hash(vec2(f) + 17.0, uSeed) - 1.0;
  o = vec4(clamp(c + n / 255.0, 0.0, 1.0), 1.0);
}`

type Target = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number }
type ProgName = 'h' | 'v' | 'copy' | 'down' | 'search' | 'median' | 'interp' | 'clean' | 'u'

class Passes {
  readonly canvas: OffscreenCanvas | HTMLCanvasElement
  private gl: WebGL2RenderingContext
  private prog: Record<ProgName, WebGLProgram>
  private src: WebGLTexture
  private mid?: Target
  private frames: [Target, Target] // the last two scaled frames
  private cur = 0
  private levels?: { l4: [Target, Target]; l8: [Target, Target]; coarse: Target; fine: Target; field: Target }
  private acc: Target
  private cleanT: Target
  private fallback?: OffscreenCanvas | HTMLCanvasElement
  private direct = true
  private weight = 0
  private seed = 0
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
    this.prog = { h: this.program(FRAG_H), v: this.program(FRAG_V), copy: this.program(FRAG_COPY), down: this.program(FRAG_DOWN), search: this.program(FRAG_SEARCH), median: this.program(FRAG_MEDIAN), interp: this.program(FRAG_INTERP), clean: this.program(FRAG_CLEAN), u: this.program(FRAG_U) }
    this.src = this.texture(false)
    this.frames = [this.target(out.w, out.h, true), this.target(out.w, out.h, true)]
    this.acc = this.target(out.w, out.h)
    this.cleanT = this.target(out.w, out.h)
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

  private texture(linear: boolean) {
    const gl = this.gl
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    const filter = linear ? gl.LINEAR : gl.NEAREST
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }

  /** A texture to draw into: half float where the device can (no banding when frames are mixed), 8 bit otherwise. */
  private target(w: number, h: number, linear = false): Target {
    const gl = this.gl
    const tex = this.texture(linear)
    if (this.float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    const fb = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    return { tex, fb, w, h }
  }

  private run(name: ProgName, into: Target | null, inputs: Record<string, WebGLTexture>, ints: Record<string, number | [number, number]> = {}, floats: Record<string, number> = {}) {
    const gl = this.gl
    const p = this.prog[name]
    gl.bindFramebuffer(gl.FRAMEBUFFER, into ? into.fb : null)
    gl.viewport(0, 0, into ? into.w : this.out.w, into ? into.h : this.out.h)
    gl.useProgram(p)
    let unit = 0
    for (const [k, t] of Object.entries(inputs)) {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.uniform1i(gl.getUniformLocation(p, k), unit++)
    }
    for (const [k, v] of Object.entries(ints)) {
      const loc = gl.getUniformLocation(p, k)
      if (Array.isArray(v)) gl.uniform2i(loc, v[0], v[1])
      else gl.uniform1i(loc, v)
    }
    for (const [k, v] of Object.entries(floats)) gl.uniform1f(gl.getUniformLocation(p, k), v)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** Puts the decoded frame on the GPU (straight from the decoder where the browser allows it, through a 2D canvas where it does not). */
  private upload(frame: VideoFrame) {
    const gl = this.gl
    const w = frame.displayWidth
    const h = frame.displayHeight
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.src)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    if (this.direct) {
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, frame as unknown as TexImageSource)
        return { w, h }
      } catch {
        this.direct = false
      }
    }
    if (!this.fallback || this.fallback.width !== w || this.fallback.height !== h)
      this.fallback = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h })
    const ctx = this.fallback.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
    ctx.drawImage(frame, 0, 0)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.fallback as unknown as TexImageSource)
    return { w, h }
  }

  /** The spatial pass for one decoded frame: uploaded, scaled across and down, kept as the newest of the last two frames. */
  spatial(frame: VideoFrame) {
    const gl = this.gl
    gl.disable(gl.BLEND)
    const raw = this.upload(frame)
    if (!this.mid) this.mid = this.target(this.out.w, this.shown.h)
    // a frame that arrives already turned (its size is the shown size) is not turned again
    const turned = (this.rotation === 90 || this.rotation === 270) && raw.w === this.shown.w && raw.h === this.shown.h && raw.w !== raw.h
    this.run('h', this.mid, { uSrc: this.src }, { uRaw: [raw.w, raw.h], uOrient: [this.shown.w, this.shown.h], uRot: turned ? 0 : this.rotation }, { uScale: this.shown.w / this.out.w })
    this.cur ^= 1
    this.run('v', this.frames[this.cur], { uSrc: this.mid.tex }, { uSrcH: this.shown.h }, { uScale: this.shown.h / this.out.h })
  }

  /** The motion from the previous frame to this one: luma pyramids, a coarse full search, a fine refinement, a median. */
  motion() {
    const { w, h } = this.out
    if (!this.levels) {
      const l4 = (): Target => this.target(Math.ceil(w / 4), Math.ceil(h / 4))
      const l8 = (): Target => this.target(Math.ceil(w / 8), Math.ceil(h / 8))
      const bw = Math.ceil(w / 16)
      const bh = Math.ceil(h / 16)
      this.levels = { l4: [l4(), l4()], l8: [l8(), l8()], coarse: this.target(bw, bh), fine: this.target(bw, bh), field: this.target(bw, bh, true) }
    }
    const L = this.levels
    const gl = this.gl
    gl.disable(gl.BLEND)
    // pyramids for both frames (the previous one's were made last time, but making both keeps the order simple and is cheap at these sizes)
    for (const k of [0, 1] as const) {
      this.run('down', L.l4[k], { uSrc: this.frames[k].tex }, { uStep: 4, uLuma: 1 })
      this.run('down', L.l8[k], { uSrc: L.l4[k].tex }, { uStep: 2, uLuma: 0 })
    }
    const a = this.cur ^ 1
    const b = this.cur
    // uPrior is unused here; it is bound to another texture because a pass may not read the texture it draws into
    this.run('search', L.coarse, { uA: L.l8[a].tex, uB: L.l8[b].tex, uPrior: L.fine.tex }, { uLevel: 8, uRadius: 6, uRefine: 0 })
    this.run('search', L.fine, { uA: L.l4[a].tex, uB: L.l4[b].tex, uPrior: L.coarse.tex }, { uLevel: 4, uRadius: 2, uRefine: 1 })
    this.run('median', L.field, { uSrc: L.fine.tex })
  }

  /** Starts an output frame: the blend buffer is emptied. */
  begin() {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.acc.fb)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    this.weight = 0
  }

  /** The newest (or previous) scaled frame added to the output frame with this weight (its share of the frame's time). */
  add(weight: number, which: 'cur' | 'prev' = 'cur') {
    const gl = this.gl
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.FUNC_ADD)
    gl.blendColor(0, 0, 0, weight)
    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE)
    this.run('copy', this.acc, { uSrc: this.frames[which === 'cur' ? this.cur : this.cur ^ 1].tex })
    gl.disable(gl.BLEND)
    this.weight += weight
  }

  /** An in-between frame at time t between the previous frame (0) and the newest (1), as the whole output frame. */
  interpolate(t: number) {
    this.gl.disable(this.gl.BLEND)
    this.run('interp', this.acc, { uA: this.frames[this.cur ^ 1].tex, uB: this.frames[this.cur].tex, uField: this.levels!.field.tex }, {}, { uT: t })
    this.weight = 1
  }

  /** The clean-up (optional) and contrast passes, drawn to the canvas the encoder reads. */
  finish(cleanup: boolean) {
    const gl = this.gl
    gl.disable(gl.BLEND)
    const norm = this.weight > 0 ? 1 / this.weight : 1
    this.seed = (this.seed + 1) % 997
    let from = this.acc.tex
    let n = norm
    if (cleanup) {
      this.run('clean', this.cleanT, { uSrc: this.acc.tex }, {}, { uNorm: norm, uSeed: this.seed })
      from = this.cleanT.tex
      n = 1
    }
    this.run('u', null, { uSrc: from }, {}, { uNorm: n, uAmount: 1.0, uSeed: this.seed })
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

/** H.264 High 4.2 first; older or software encoders get the closest they can do. */
const H264 = ['avc1.64002A', 'avc1.640028', 'avc1.4D402A', 'avc1.4D4028', 'avc1.42E02A', 'avc1.42E028']
/** HEVC Main, level 4.1 (enough for 1080p at 60fps), then 4.0. */
const HEVC = ['hvc1.1.6.L123.B0', 'hvc1.1.6.L120.B0', 'hev1.1.6.L123.B0']
const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, '0')

function encoderLabel(codec: string) {
  if (codec.startsWith('hvc1') || codec.startsWith('hev1')) {
    const level = Number(/\.L(\d+)/.exec(codec)?.[1] ?? 123) / 30
    return `HEVC Main ${level.toFixed(1)}`
  }
  const prof = codec.slice(5, 7)
  const level = parseInt(codec.slice(9, 11), 16) / 10
  return `H.264 ${prof === '64' ? 'High' : prof === '4D' ? 'Main' : 'Baseline'} ${level.toFixed(1)}`
}

/**
 * Hardware encoders pick the lowest level a stream needs (a 30fps 1080p stream comes out as 4.0). Every stream that meets a level also meets every level
 * above it, so a High profile stream below 4.2 is marked 4.2: in the avcC record and in the sequence parameter set inside it.
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

async function pickEncoder(plan: Plan, codec: Codec, bitrate: number) {
  for (const c of codec === 'hevc' ? HEVC : H264) {
    const config: VideoEncoderConfig = {
      codec: c,
      width: plan.width,
      height: plan.height,
      bitrate,
      framerate: plan.fps,
      bitrateMode: 'variable',
      latencyMode: 'quality',
      ...(codec === 'avc' ? { avc: { format: 'avc' as const } } : {}),
    }
    try {
      if ((await VideoEncoder.isConfigSupported(config)).supported) return config
    } catch {
      /* try the next */
    }
  }
  throw new Error(codec === 'hevc' ? 'This browser cannot encode HEVC at this size. Choose H.264.' : 'This browser cannot encode H.264 at this size. Try Chrome, Edge or Safari on a computer.')
}

export async function patch(p: Probe, plan: Plan, opts: Options, onLive: (l: Live) => void, signal: AbortSignal, tag = ''): Promise<Result> {
  const M = await import('mediabunny')
  const started = performance.now()
  const input = new M.Input({ source: new M.BlobSource(p.file), formats: M.ALL_FORMATS })
  const target = new M.BufferTarget()
  const output = new M.Output({ format: new M.Mp4OutputFormat({ fastStart: 'in-memory' }), target })
  let encoder: VideoEncoder | null = null
  const state: { passes: Passes | null } = { passes: null }
  const stop = () => {
    if (signal.aborted) throw new DOMException('Stopped', 'AbortError')
  }

  try {
    const vt = await input.getPrimaryVideoTrack()
    if (!vt) throw new Error('There is no video in this file.')
    const rotation = await vt.getRotation()
    const bitrate = opts.bitrate ?? defaultBitrate(plan, opts.codec)
    const config = await pickEncoder(plan, opts.codec, bitrate)

    // the video track: our own encoder, so the profile, the level and the Rec.709 flags are exactly what we ask for. A constant frame rate.
    const videoOut = new M.EncodedVideoPacketSource(opts.codec)
    output.addVideoTrack(videoOut, { frameRate: plan.fps })

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
    let written = config.codec
    encoder = new VideoEncoder({
      output: (chunk, meta) => {
        encoded++
        let m: EncodedVideoChunkMetadata | undefined = meta
        if (meta?.decoderConfig) {
          const dc = opts.codec === 'avc' ? markLevel42({ ...meta.decoderConfig, colorSpace: REC709 }) : { ...meta.decoderConfig, colorSpace: REC709 }
          if (opts.codec === 'avc' && dc.description) {
            const d = dc.description instanceof ArrayBuffer ? new Uint8Array(dc.description) : new Uint8Array(dc.description.buffer, dc.description.byteOffset, dc.description.byteLength)
            written = `avc1.${hex2(d[1])}${hex2(d[2])}${hex2(d[3])}`
          }
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
    let made = 0 // output frames put together (blended, interpolated or kept)
    let finished = 0 // output frames through clean-up and contrast
    let lastLive = 0
    const live = (force = false) => {
      const now = performance.now()
      if (!force && now - lastLive < 120) return
      lastLive = now
      const done = Math.min(1, encoded / expectedOut)
      const secs = (now - started) / 1000
      const speed = secs > 0 ? scaled / secs : 0
      const out = Math.min(1, finished / expectedOut)
      onLive({
        stages: { spatial: Math.min(1, scaled / expectedIn), temporal: Math.min(1, made / expectedOut), cleanup: opts.cleanup ? out : 0, contrast: out, export: done, delivery: 0 },
        overall: done * 0.97,
        speed,
        eta: speed > 0 && scaled > 10 ? Math.max(0, (expectedIn - scaled) / speed) : null,
        finalizing: false,
      })
    }

    const keyEvery = Math.max(1, Math.round(plan.fps)) // a key frame every second
    let outIndex = 0
    const emit = async (timestamp: number, duration: number) => {
      const canvas = state.passes!.finish(opts.cleanup)
      finished++
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
      let current = -1 // blend mode: the output frame being blended
      let currentHas = false
      let prevT: number | null = null // interp mode: the previous input frame's time
      let nextK = 0 // interp mode: the next output frame to make
      let endT = 0
      for await (const sample of new M.VideoSampleSink(vt).samples()) {
        try {
          stop()
          if (first === null) first = sample.timestamp
          const frame = sample.toVideoFrame()
          try {
            if (!state.passes) state.passes = new Passes({ w: plan.width, h: plan.height }, { w: p.width, h: p.height }, rotation)
            state.passes.spatial(frame)
          } finally {
            frame.close()
          }
          scaled++
          const passes = state.passes
          const t0 = sample.timestamp - first
          const d = sample.duration > 0 ? sample.duration : 1 / p.fps
          endT = t0 + d

          if (plan.mode === 'pass') {
            passes.begin()
            passes.add(1)
            made++
            await emit(t0, d)
            continue
          }

          if (plan.mode === 'interp') {
            // every 60fps frame between the previous input frame and this one: made in between them, along the motion
            if (prevT !== null && t0 > prevT) {
              let moved = false
              while (nextK * outDur < t0 - 1e-6) {
                const t = (nextK * outDur - prevT) / (t0 - prevT)
                if (t < 0.03) {
                  passes.begin()
                  passes.add(1, 'prev')
                } else {
                  if (!moved) {
                    passes.motion()
                    moved = true
                  }
                  passes.interpolate(Math.min(1, t))
                }
                made++
                await emit(nextK * outDur, outDur)
                nextK++
              }
            }
            prevT = t0
            continue
          }

          // blend: the frame is split over the 60fps frames it overlaps, each part weighted by how much of that frame's time it covers
          let a = t0
          const b = t0 + d
          while (a < b - 1e-9) {
            const k = Math.floor(a / outDur + 1e-6)
            const end = Math.min(b, (k + 1) * outDur)
            if (k !== current) {
              if (currentHas) {
                made++
                await emit(current * outDur, outDur)
              }
              current = k
              currentHas = false
              passes.begin()
            }
            passes.add((end - a) / outDur)
            currentHas = true
            a = end
          }
        } finally {
          sample.close()
        }
      }
      const passes = state.passes
      if (passes && plan.mode === 'blend' && currentHas) {
        made++
        await emit(current * outDur, outDur)
      }
      if (passes && plan.mode === 'interp') {
        // the last input frame holds until the edit ends
        while (nextK * outDur < endT - 1e-6) {
          passes.begin()
          passes.add(1)
          made++
          await emit(nextK * outDur, outDur)
          nextK++
        }
      }
      await encoder!.flush()
      if (encodeError) throw encodeError
      await writing
      videoOut.close()
    }

    await Promise.all([feedVideo(), feedAudio?.()])
    live(true)
    onLive({ stages: { spatial: 1, temporal: 1, cleanup: opts.cleanup ? 1 : 0, contrast: 1, export: 1, delivery: 0 }, overall: 0.97, speed: 0, eta: 0, finalizing: true })
    await output.finalize()
    if (!target.buffer) throw new Error('The file could not be written.')

    // the delivery pass: the frame-count patch on the finished MP4 (see frame-count-patch.ts). If it cannot be applied, the file is kept as it is.
    let buffer: ArrayBuffer | Uint8Array = target.buffer
    let delivery: Result['delivery'] = null
    let deliveryError: string | null = null
    if (opts.deliveryPatch && opts.codec === 'avc') {
      try {
        const out = patchFrameCount(target.buffer, { multiplier: DEFAULT_MULTIPLIER })
        buffer = out.bytes
        delivery = { real: out.stats.realFrames, declared: out.stats.declaredFrames }
      } catch (e) {
        deliveryError = e instanceof Error ? e.message : 'The delivery patch could not be applied.'
      }
    }
    onLive({ stages: { spatial: 1, temporal: 1, cleanup: opts.cleanup ? 1 : 0, contrast: 1, export: 1, delivery: 1 }, overall: 0.99, speed: 0, eta: 0, finalizing: true })
    const name = `${p.file.name.replace(/\.[^.]+$/, '') || 'video'}-tiktok-${plan.width}x${plan.height}-${fpsText(plan.fps)}fps${tag ? `-${tag}` : ''}.mp4`
    return {
      url: URL.createObjectURL(new Blob([buffer as BlobPart], { type: 'video/mp4' })),
      name,
      bytes: buffer.byteLength,
      encoder: encoderLabel(written),
      seconds: (performance.now() - started) / 1000,
      audio,
      delivery,
      deliveryError,
    }
  } catch (e) {
    await output.cancel().catch(() => undefined)
    throw e
  } finally {
    if (encoder && encoder.state !== 'closed') encoder.close()
    state.passes?.dispose()
    input.dispose()
  }
}

/** The test pack: the same edit, three clean ways, to see which TikTok plays best on this account. No tricks in any of them. */
export function testPack(plan: Plan, hevc: boolean): { tag: string; label: string; codec: Codec; bitrate: number }[] {
  const scale = (plan.width * plan.height * plan.fps) / (1080 * 1920 * 60)
  const mbps = (n: number) => Math.round(Math.min(40e6, Math.max(4e6, n * 1e6 * scale)))
  const a = { tag: 'h264-20m', label: 'H.264 · high bitrate', codec: 'avc' as const, bitrate: mbps(20) }
  const b = { tag: 'h264-12m', label: 'H.264 · TikTok-sized bitrate', codec: 'avc' as const, bitrate: mbps(12) }
  const c = hevc ? { tag: 'hevc-14m', label: 'HEVC · high bitrate', codec: 'hevc' as const, bitrate: mbps(14) } : { tag: 'h264-32m', label: 'H.264 · very high bitrate', codec: 'avc' as const, bitrate: mbps(32) }
  return [a, b, c]
}
