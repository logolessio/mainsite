'use client'

import { type MotionValue, motion, useMotionTemplate, useTransform } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { cn } from '@/lib/utils'

/**
 * The look of the home page and the first-run tour: soft colour fields with speckle, a pixel game guide, retro windows with a hard square shadow and
 * mountains in flat shapes. Everything is square.
 */

/** A scroll-driven value. People who asked for less motion get `rest` instead, and nothing moves. */
export function useMap<T extends number | string>(p: MotionValue<number>, input: number[], output: T[], reduced: boolean, rest: T): MotionValue<T extends number ? number : string> {
  return useTransform(p, input, reduced ? input.map(() => rest) : output) as unknown as MotionValue<T extends number ? number : string>
}

export const INK = '#0c1544' // the deep blue the boxes are filled with
export const CREAM = '#f4ead6'

/** Small pictures drawn one square at a time. `X` is filled, `o` is the eye, anything else is empty. */
export function Pixels({ rows, fill = 'currentColor', eye = INK, className }: { rows: string[]; fill?: string; eye?: string; className?: string }) {
  return (
    <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" aria-hidden="true" className={className}>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === 'X' || c === 'o' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={c === 'o' ? eye : fill} /> : null)))}
    </svg>
  )
}
export const JACKAL = ['..XX....XX..', '..XXX..XXX..', '..XXX..XXX..', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XXoXXXXoXX.', '.XXXXXXXXXX.', '..XXXXXXXX..', '...XXXXXX...', '...XXXXXX...', '....XXXX....', '.....XX.....']
export const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
export const PLAY = ['XX.....', 'XXXX...', 'XXXXXX.', 'XXXXXXX', 'XXXXXX.', 'XXXX...', 'XX.....']
export const ARROW = ['X.........', 'XX........', 'XXX.......', 'XXXX......', 'XXXXX.....', 'XXXXXX....', 'XXXXXXX...', 'XXXXX.....', 'XX.XXX....', 'X..XXX....', '....XXX...', '....XXX...']

/** Soft blobs of teal, blue, salmon and red that drift as `at` goes from 0 to 1 (the page scroll, or the step of the tour), with fine speckle over them. */
export function MeshField({ at }: { at: MotionValue<number> }) {
  const { reduced } = useMotionPrefs()
  const pos = (a: string[], b: string[]) => [useMap(at, [0, 0.25, 0.5, 0.75, 1], a, reduced, a[0]), useMap(at, [0, 0.25, 0.5, 0.75, 1], b, reduced, b[0])] as const
  const [ax, ay] = pos(['14%', '70%', '88%', '30%', '60%'], ['18%', '22%', '70%', '80%', '30%'])
  const [bx, by] = pos(['86%', '20%', '14%', '82%', '30%'], ['26%', '70%', '24%', '30%', '78%'])
  const [cx, cy] = pos(['16%', '84%', '62%', '14%', '84%'], ['82%', '70%', '86%', '22%', '66%'])
  const [dx, dy] = pos(['78%', '40%', '30%', '66%', '14%'], ['84%', '30%', '24%', '76%', '24%'])
  const bg = useMotionTemplate`radial-gradient(55% 52% at ${ax} ${ay}, #5fd1b6, transparent 72%), radial-gradient(52% 56% at ${bx} ${by}, #2b4fa3, transparent 74%), radial-gradient(52% 52% at ${cx} ${cy}, #f19b78, transparent 72%), radial-gradient(56% 56% at ${dx} ${dy}, #ec5a4f, transparent 74%), #22377f`
  return (
    <>
      <motion.div aria-hidden="true" style={{ background: bg }} className="fixed inset-0 z-0" />
      <div aria-hidden="true" className="speckle pointer-events-none fixed inset-0 z-0 opacity-25" />
    </>
  )
}

/** A small window: a deep blue title bar with three square lights, a cream body and a hard square shadow. */
export function Win({ title, children, className, bodyClass }: { title: string; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <div className={cn('border border-[#0c1544] bg-[#f3f1ec] text-[#0c1544] shadow-[7px_7px_0_#0c1544]', className)}>
      <div className="flex h-7 items-center gap-1.5 px-2.5" style={{ background: INK }}>
        {['#ec5a4f', '#f1b84f', '#5fd1b6'].map((c) => (
          <span key={c} className="size-[7px]" style={{ background: c }} />
        ))}
        <span className="pix ml-2 truncate text-[0.62rem] tracking-[0.1em] uppercase" style={{ color: CREAM }}>
          {title}
        </span>
      </div>
      <div className={bodyClass}>{children}</div>
    </div>
  )
}

/** Three ranges of mountains drawn in flat shapes with speckle, each sliding at its own speed. */
export function Mountains({ p, className }: { p: MotionValue<number>; className?: string }) {
  const { reduced } = useMotionPrefs()
  const far = useMap(p, [0, 1], ['4vh', '-8vh'], reduced, '0vh')
  const mid = useMap(p, [0, 1], ['10vh', '-16vh'], reduced, '0vh')
  const near = useMap(p, [0, 1], ['18vh', '-26vh'], reduced, '0vh')
  const box = 'absolute inset-x-0 bottom-0 h-full w-full'
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-[48vh] overflow-hidden', className)}>
      <motion.svg style={{ y: far }} viewBox="0 0 1200 400" preserveAspectRatio="none" className={box}>
        <polygon filter="url(#speck)" fill="#2a4aa0" points="0,400 0,250 90,200 180,240 300,150 380,210 470,120 560,200 680,170 780,230 900,160 1010,220 1100,190 1200,230 1200,400" />
      </motion.svg>
      <motion.svg style={{ y: mid }} viewBox="0 0 1200 400" preserveAspectRatio="none" className={box}>
        <polygon filter="url(#speck)" fill="#f19b78" points="250,400 520,60 590,210 560,400" />
        <polygon filter="url(#speck)" fill="#14226b" points="520,60 700,120 960,400 560,400 590,210" />
        <polygon fill="#f4ead6" fillOpacity=".85" points="520,60 540,90 528,96 514,84" />
      </motion.svg>
      <motion.svg style={{ y: near }} viewBox="0 0 1200 400" preserveAspectRatio="none" className={box}>
        <polygon filter="url(#speck)" fill="#2fae96" points="0,400 0,330 140,290 260,330 420,300 560,340 700,310 860,350 1000,310 1200,350 1200,400" />
      </motion.svg>
    </div>
  )
}

/** A line of dialogue in a square box with the speaker on a small tab. `solid` is the light one. */
export function Say({ who, children, solid = false, className, style }: { who?: string; children: ReactNode; solid?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <div style={{ background: solid ? CREAM : INK, color: solid ? INK : CREAM, ...style }} className={cn('relative border px-5 pt-7 pb-4 text-[0.82rem] leading-[1.65]', solid ? 'border-[#f4ead6]' : 'border-white/85', className)}>
      {who && (
        <span className="pix absolute top-0 left-0 border-r border-b px-2.5 py-1 text-[0.58rem] tracking-[0.18em] uppercase" style={{ borderColor: solid ? `${INK}66` : 'rgb(255 255 255 / 0.85)', opacity: 0.8 }}>
          {who}
        </span>
      )}
      {children}
    </div>
  )
}


export const HARD = { textShadow: '0.04em 0.04em 0 #0c1544' } as const

/** The speckle the mountains use. Put it once on a page that draws them. */
export function SpeckFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <filter id="speck" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n" />
          <feColorMatrix in="n" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 9 -6" result="dots" />
          <feComposite in="dots" in2="SourceAlpha" operator="in" result="d" />
          <feBlend in="SourceGraphic" in2="d" mode="screen" />
        </filter>
      </defs>
    </svg>
  )
}
