'use client'

import { motion, useTransform } from 'framer-motion'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { CardEffectLayer } from '@/components/profile/card-effect'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { grey, hexRgb, imgSrc, pageLight } from '@/lib/bio'
import { bgVideoSrc, giphyImage, tintHex } from '@/lib/profile-extras'
import { useBio } from './context'

const rgba = (hex: string, a: number) => `rgb(${hexRgb(hex).join(' ')} / ${a})`

/** A still gradient of the page's two backgrounds, in one of four shapes. With colours the mesh also picks up the two accents. */
function gradientCss(style: string, A: string, B: string, angle: number, tints?: [string, string]) {
  if (style === 'linear') return `linear-gradient(${angle}deg, ${A}, ${B})`
  if (style === 'conic') return `conic-gradient(from ${angle}deg at 50% 50%, ${A}, ${B}, ${A})`
  if (style === 'mesh') {
    const one = tints ? rgba(tints[0], 0.55) : B
    const two = tints ? rgba(tints[1], 0.45) : B
    return `radial-gradient(60% 50% at 18% 20%, ${one}, transparent 70%), radial-gradient(55% 55% at 85% 30%, ${two}, transparent 70%), radial-gradient(70% 60% at 50% 95%, ${B}, transparent 72%), ${A}`
  }
  return `radial-gradient(120% 90% at 50% 18%, ${B} 0%, ${A} 72%)`
}

function LoopVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const { reduced } = useMotionPrefs()
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (reduced) v.pause()
    else void v.play().catch(() => {})
    const onVis = () => (document.hidden || reduced ? v.pause() : void v.play().catch(() => {}))
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [reduced, src])
  return <video ref={ref} src={src} muted loop playsInline autoPlay={!reduced} preload="auto" disablePictureInPicture className="absolute inset-0 size-full object-cover" />
}

/**
 * A YouTube video behind the page: muted, looping, with none of YouTube's controls. The player is drawn larger than the screen (and its edges cropped) so the
 * title strip and the watermark fall outside it, and nothing on it can be pressed. Until it is playing, the video's own picture shows.
 */
function YouTubeBg({ id, start, still }: { id: string; start: number; still: boolean }) {
  const [on, setOn] = useState(false)
  const src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&start=${start}`
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
      {!still && (
        <iframe
          src={src}
          title=""
          tabIndex={-1}
          aria-hidden="true"
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => window.setTimeout(() => setOn(true), 1200)}
          className="pointer-events-none absolute top-1/2 left-1/2 border-0 transition-opacity duration-1000"
          style={{ width: 'max(100cqw, 177.78cqh)', height: 'max(56.25cqw, 100cqh)', transform: 'translate(-50%, -50%) scale(1.34)', opacity: on ? 1 : 0 }}
        />
      )}
    </div>
  )
}

/**
 * Everything behind the page: a colour or a still gradient, or a picture, GIF or video (dimmed and softened if asked), and the effect that plays over it
 * (snow, embers, smoke and the rest). The background itself never moves on its own; it leans a little against the pointer when the page has depth.
 */
export function BioBackground() {
  const { cfg, mode, sy, px, py, reduced } = useBio()
  const bg = cfg.bg
  const col = cfg.colors
  const custom = col.on
  const light = pageLight(cfg)
  const media = bg.kind === 'image' || bg.kind === 'gif' || bg.kind === 'video' || bg.kind === 'youtube'
  const lean = reduced || mode === 'mini' ? 0 : (bg.parallax / 100) * (cfg.fx.depth / 100)
  const x = useTransform(px, (v) => -v * 16 * lean)
  const y = useTransform([sy, py] as never, ([s, p]: number[]) => -s * lean * 0.1 - p * 16 * lean)
  const A = custom ? col.bg : grey(bg.tone)
  const B = custom ? col.bg2 : grey(bg.tone2)
  const accents: [string, string] = custom ? [col.accent, col.accent2] : light ? ['#222222', '#777777'] : ['#ffffff', '#8c8c8c']
  const fx = custom ? col.text : light ? '#1a1a1a' : '#ffffff'
  const filter = [bg.mono && media ? 'grayscale(1)' : '', bg.blur ? `blur(${bg.blur}px)` : ''].filter(Boolean).join(' ')
  const scale = 1 + Math.min(0.2, bg.blur / 120) + (lean ? 0.08 : 0.02)
  const style: CSSProperties = { filter: filter || undefined }
  const effect = cfg.overlay.effect
  const tint = { color: custom ? col.accent : fx, amount: custom ? 80 : 100 }
  return (
    <div aria-hidden="true" className="bio-layer bio-bg" style={{ background: A }}>
      <motion.div className="absolute inset-0" style={{ ...style, scale, x, y, willChange: lean ? 'transform' : undefined }}>
        {bg.kind === 'gradient' && <div className="absolute inset-0" style={{ background: gradientCss(bg.gradient, A, B, bg.angle, custom ? accents : undefined) }} />}
        {bg.kind === 'image' && bg.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc(bg.image)} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
        )}
        {bg.kind === 'gif' && bg.gif && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={giphyImage(bg.gif)} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
        )}
        {bg.kind === 'video' && bg.video && mode !== 'mini' && <LoopVideo src={bgVideoSrc(bg.video)} />}
        {bg.kind === 'youtube' && bg.youtube && <YouTubeBg id={bg.youtube} start={bg.ytStart} still={mode === 'mini' || reduced} />}
        {media && bg.dim > 0 && <div className="absolute inset-0" style={{ background: light ? '#fff' : '#000', opacity: (bg.dim / 100) * 0.85 }} />}
      </motion.div>
      {effect !== 'none' && mode !== 'mini' && (
        <div className="absolute inset-0">
          <CardEffectLayer effect={effect} intensity={cfg.overlay.intensity} speed={cfg.overlay.speed} colors={[tintHex(accents[0], tint.color, tint.amount), tintHex(accents[1], tint.color, tint.amount)]} tint={tint} scope="page" />
        </div>
      )}
    </div>
  )
}

/** Grain, scan lines and the dark edge: the film on top of everything. */
export function BioFilm() {
  const { cfg, mode } = useBio()
  return (
    <>
      {cfg.bg.vignette > 0 && <div aria-hidden="true" className="bio-layer bio-vig" style={{ opacity: (cfg.bg.vignette / 100) * (pageLight(cfg) ? 0.35 : 0.9) }} />}
      {cfg.fx.grain > 0 && mode !== 'mini' && <div aria-hidden="true" className="bio-layer bio-grain" style={{ opacity: (cfg.fx.grain / 100) * 0.9 }} />}
      {cfg.fx.scanlines > 0 && mode !== 'mini' && <div aria-hidden="true" className="bio-layer bio-scan" style={{ opacity: (cfg.fx.scanlines / 100) * 0.35 }} />}
    </>
  )
}
