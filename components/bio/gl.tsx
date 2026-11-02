'use client'

import type { MotionValue } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useBio } from './context'
import { SHADER_SCALE, SHADER_SOURCE, VERTEX } from './shaders'

export type ShaderId = keyof typeof SHADER_SOURCE

/**
 * One of the moving backgrounds (shaders.ts) drawn with WebGL on a canvas that fills its box. It follows the pointer, listens to the music, runs at most as
 * fast as the screen and stops when it is out of sight or the tab is hidden. With no WebGL, or with "reduce motion", it draws one still frame (or nothing).
 */
export function ShaderCanvas({ id }: { id: ShaderId }) {
  const { cfg, px, py, level, reduced } = useBio()
  return <ShaderRunner id={id} tone={cfg.bg.tone} intensity={cfg.bg.intensity} speed={cfg.bg.speed} px={px} py={py} level={level} reduced={reduced} />
}

/** The same thing with everything passed in, for places outside a page (the home page). `tone` 0 to 100, `intensity` and `speed` 0 to 100, `px` and `py` -1 to 1. */
export function ShaderRunner({ id, tone: tone100, intensity, speed, px, py, level, reduced }: { id: ShaderId; tone: number; intensity: number; speed: number; px: MotionValue<number>; py: MotionValue<number>; level: MotionValue<number>; reduced: boolean }) {
  const holder = useRef<HTMLDivElement>(null)
  const tone = tone100 / 100
  const light = tone100 > 55
  const live = useRef({ k: 0.5, speed: 0.4, tone, inv: light ? 1 : 0 })
  live.current = { k: 0.3 + (intensity / 100) * 0.7, speed: 0.2 + (speed / 100) * 1.8, tone, inv: light ? 1 : 0 }

  useEffect(() => {
    const box = holder.current
    if (!box) return
    // a fresh canvas for every run: a canvas whose context was given up cannot be given a new one (which is what happens when React runs an effect twice)
    const cv = document.createElement('canvas')
    cv.setAttribute('aria-hidden', 'true')
    cv.className = 'absolute inset-0 size-full'
    box.appendChild(cv)
    let gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false }) as WebGLRenderingContext | null
    if (!gl) return
    let prog: WebGLProgram | null = null
    let loc: Record<string, WebGLUniformLocation | null> = {}
    let raf = 0
    let last = 0
    let t = Math.random() * 40
    let onScreen = true
    let dead = false

    const build = () => {
      if (!gl) return false
      const make = (type: number, src: string) => {
        const s = gl!.createShader(type)!
        gl!.shaderSource(s, src)
        gl!.compileShader(s)
        if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
          console.warn('shader', id, gl!.getShaderInfoLog(s))
          return null
        }
        return s
      }
      const vs = make(gl.VERTEX_SHADER, VERTEX)
      const fs = make(gl.FRAGMENT_SHADER, SHADER_SOURCE[id])
      if (!vs || !fs) return false
      prog = gl.createProgram()!
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false
      gl.useProgram(prog)
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const a = gl.getAttribLocation(prog, 'a')
      gl.enableVertexAttribArray(a)
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
      loc = {}
      for (const n of ['u_res', 'u_time', 'u_ptr', 'u_k', 'u_tone', 'u_inv', 'u_audio']) loc[n] = gl.getUniformLocation(prog, n)
      return true
    }

    const size = () => {
      const r = cv.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const sc = SHADER_SCALE[id]
      const w = Math.max(2, Math.round(r.width * dpr * sc))
      const h = Math.max(2, Math.round(r.height * dpr * sc))
      if (cv.width !== w || cv.height !== h) {
        cv.width = w
        cv.height = h
      }
      gl?.viewport(0, 0, w, h)
    }

    const draw = () => {
      if (!gl || !prog) return
      const L = live.current
      gl.uniform2f(loc.u_res, cv.width, cv.height)
      gl.uniform1f(loc.u_time, t)
      gl.uniform2f(loc.u_ptr, 0.5 + px.get() * 0.5, 0.5 - py.get() * 0.5)
      gl.uniform1f(loc.u_k, L.k)
      gl.uniform1f(loc.u_tone, L.tone)
      gl.uniform1f(loc.u_inv, L.inv)
      gl.uniform1f(loc.u_audio, level.get())
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const frame = (now: number) => {
      raf = 0
      if (dead || !onScreen || document.hidden) return
      const dt = Math.min(0.1, (now - last) / 1000 || 0.016)
      last = now
      t += dt * live.current.speed
      draw()
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (raf || reduced || !onScreen || document.hidden || dead) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    if (!build()) {
      cv.remove()
      return
    }
    size()
    draw()
    const ro = new ResizeObserver(() => {
      size()
      draw()
    })
    ro.observe(cv)
    const io = new IntersectionObserver((e) => {
      onScreen = e[0]?.isIntersecting ?? true
      start()
    })
    io.observe(cv)
    const vis = () => start()
    document.addEventListener('visibilitychange', vis)
    const lost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      raf = 0
    }
    const restored = () => {
      gl = cv.getContext('webgl') as WebGLRenderingContext | null
      if (gl && build()) {
        size()
        start()
      }
    }
    cv.addEventListener('webglcontextlost', lost)
    cv.addEventListener('webglcontextrestored', restored)
    start()
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', vis)
      cv.removeEventListener('webglcontextlost', lost)
      cv.removeEventListener('webglcontextrestored', restored)
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
      cv.remove()
    }
  }, [id, reduced, px, py, level])

  return <div ref={holder} aria-hidden="true" className="absolute inset-0" />
}
