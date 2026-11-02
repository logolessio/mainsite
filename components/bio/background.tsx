'use client'

import { motion, useTransform } from 'framer-motion'
import type { CSSProperties } from 'react'
import { ProfileBackdrop } from '@/components/profile/profile-backdrop'
import { ShaderCanvas } from './gl'
import { DEFAULT_EXTRAS } from '@/lib/profile-extras'
import { grey, isLight } from '@/lib/bio'
import { useBio } from './context'

const hex = (tone: number) => {
  const v = Math.round((Math.max(0, Math.min(100, tone)) / 100) * 255)
  const h = v.toString(16).padStart(2, '0')
  return `#${h}${h}${h}`
}

/** A grey gradient made of the page's two tones, in one of four shapes. */
function gradientCss(style: string, a: number, b: number, angle: number) {
  const A = grey(a)
  const B = grey(b)
  if (style === 'radial') return `radial-gradient(120% 90% at 50% 18%, ${B} 0%, ${A} 70%)`
  if (style === 'conic') return `conic-gradient(from ${angle}deg at 50% 50%, ${A}, ${B}, ${A})`
  if (style === 'mesh') {
    const m = grey((a + b) / 2)
    return `radial-gradient(60% 50% at 18% 20%, ${B}, transparent 70%), radial-gradient(55% 55% at 85% 30%, ${m}, transparent 70%), radial-gradient(70% 60% at 50% 95%, ${B}, transparent 72%), ${A}`
  }
  return `linear-gradient(${angle}deg, ${A}, ${B})`
}

/** Everything behind the page, in greys: a tone, a gradient, a moving effect, or a picture, GIF or video (turned to grey unless the person turned that off). */
export function BioBackground() {
  const { cfg, mode, sy, reduced } = useBio()
  const bg = cfg.bg
  const light = isLight(bg.tone)
  const k = reduced ? 0 : (bg.parallax / 100) * 0.16
  const y = useTransform(sy, (v) => -v * k)
  const media = bg.kind === 'image' || bg.kind === 'gif' || bg.kind === 'video'
  // the small moving pictures on the home page get a still version of an effect: forty live canvases would be too much
  const still = mode === 'mini' && (bg.kind === 'effect' || bg.kind === 'shader')
  const filter = [bg.mono || bg.kind === 'effect' || bg.kind === 'shader' ? 'grayscale(1)' : '', bg.blur ? `blur(${bg.blur}px)` : ''].filter(Boolean).join(' ')
  const scale = 1 + Math.min(0.2, bg.blur / 120) + (k ? 0.1 : 0.02)
  const base = hex(bg.tone)
  const fx = light ? '#1a1a1a' : '#ffffff'
  const accents: [string, string] = light ? ['#222222', '#777777'] : ['#ffffff', '#8c8c8c']
  const style: CSSProperties = { filter: filter || undefined }
  return (
    <div aria-hidden="true" className="bio-layer bio-bg" style={{ background: grey(bg.tone) }}>
      <motion.div className="absolute inset-0" style={{ ...style, scale, y, willChange: k ? 'transform' : undefined }}>
        {(bg.kind === 'gradient' || still) && <div className="absolute inset-0" style={{ background: gradientCss(still ? 'radial' : bg.gradient, bg.tone, still ? Math.min(100, bg.tone + (light ? -18 : 20)) : bg.tone2, bg.angle) }} />}
        {bg.kind === 'gradient' && bg.gradient === 'mesh' && !reduced && mode !== 'mini' && (
          <div className="absolute inset-[-20%] opacity-70" style={{ background: gradientCss('mesh', bg.tone, bg.tone2, 0), animation: `bio-spin ${240 - bg.speed * 1.6}s linear infinite` }} />
        )}
        {bg.kind === 'shader' && !still && (
          <>
            <ShaderCanvas id={bg.shader} />
            {bg.dim > 0 && <div className="absolute inset-0" style={{ background: light ? '#fff' : '#000', opacity: (bg.dim / 100) * 0.85 }} />}
          </>
        )}
        {(media || (bg.kind === 'effect' && !still)) && (
          <ProfileBackdrop
            scope="box"
            color={fx}
            accents={accents}
            bg={{ ...DEFAULT_EXTRAS.bg, kind: media ? (bg.kind as 'image' | 'gif' | 'video') : 'effect', effect: bg.effect, color: base, image: bg.image, gif: bg.gif, video: bg.video, dim: bg.dim, noise: 0, intensity: bg.intensity, speed: bg.speed }}
            overlay={{ effect: cfg.overlay.effect === 'none' ? 'none' : cfg.overlay.effect, intensity: cfg.overlay.intensity, speed: cfg.overlay.speed, tint: fx, tintAmount: 100 }}
          />
        )}
        {!media && bg.kind !== 'effect' && cfg.overlay.effect !== 'none' && mode !== 'mini' && (
          <ProfileBackdrop scope="box" color={fx} accents={accents} bg={{ ...DEFAULT_EXTRAS.bg, kind: 'color', color: 'transparent', dim: 0, noise: 0 }} overlay={{ effect: cfg.overlay.effect, intensity: cfg.overlay.intensity, speed: cfg.overlay.speed, tint: fx, tintAmount: 100 }} />
        )}
      </motion.div>
    </div>
  )
}

/** Grain, scan lines and the dark edge: the film on top of everything. */
export function BioFilm() {
  const { cfg, mode } = useBio()
  return (
    <>
      {cfg.bg.vignette > 0 && <div aria-hidden="true" className="bio-layer bio-vig" style={{ opacity: (cfg.bg.vignette / 100) * (isLight(cfg.theme.tone) ? 0.35 : 0.9) }} />}
      {cfg.fx.grain > 0 && mode !== 'mini' && <div aria-hidden="true" className="bio-layer bio-grain" style={{ opacity: (cfg.fx.grain / 100) * 0.9 }} />}
      {cfg.fx.scanlines > 0 && mode !== 'mini' && <div aria-hidden="true" className="bio-layer bio-scan" style={{ opacity: (cfg.fx.scanlines / 100) * 0.35 }} />}
    </>
  )
}
