'use client'

import { motion, useTransform, type MotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * The arch: four thin outlines nested one inside the other, drawn in one after another, around a window. In the window a sun rises over two
 * ridges, a band of light crosses now and then, and everything inside sits at its own depth, so it slides against the rest as the pointer
 * moves and as the page scrolls.
 */
export function ArchWindow({ pointer, scroll, className }: { pointer: { x: MotionValue<number>; y: MotionValue<number> }; scroll: MotionValue<number>; className?: string }) {
  const sunX = useTransform(pointer.x, (v) => v * 26)
  const sunY = useTransform([pointer.y, scroll] as MotionValue<number>[], ([v, y]: number[]) => v * 18 - y * 0.08)
  const farX = useTransform(pointer.x, (v) => v * -14)
  const nearX = useTransform(pointer.x, (v) => v * -30)
  const nearY = useTransform(scroll, (y) => y * -0.04)
  const rings = [0, 1, 2, 3]
  return (
    <div className={cn('relative mx-auto aspect-[4/5.1] w-[min(30rem,78vw)]', className)}>
      {rings.map((i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          initial={{ clipPath: 'inset(100% 0 0 0)', opacity: 0 }}
          animate={{ clipPath: 'inset(0% 0 0 0)', opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5 + i * 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="absolute rounded-t-full border border-white/45"
          style={{ inset: `${i * 2.1}% ${i * 2.6}% 0 ${i * 2.6}%`, opacity: 1 - i * 0.14 }}
        />
      ))}
      <motion.div
        initial={{ clipPath: 'inset(100% 0 0 0)' }}
        animate={{ clipPath: 'inset(0% 0 0 0)' }}
        transition={{ duration: 1.7, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
        className="absolute overflow-hidden rounded-t-full bg-[#06060c]"
        style={{ inset: '8.6% 10.6% 0 10.6%' }}
      >
        {/* the sky: a slow turning wash of the page's own colours */}
        <div className="absolute inset-[-40%] opacity-90" style={{ background: 'conic-gradient(from 90deg at 50% 60%, hsl(calc(var(--stage-h) + 6) 88% 44%), hsl(calc(var(--stage-h) + 38) 92% 56%), hsl(calc(var(--stage-h) - 26) 86% 46%), hsl(calc(var(--stage-h) + 14) 90% 40%), hsl(calc(var(--stage-h) + 6) 88% 44%))', animation: 'stage-spin 46s linear infinite' }} />
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_100%,rgba(5,5,10,0.92),transparent_70%)]" />
        {/* the sun */}
        <motion.div className="absolute top-[24%] left-1/2 aspect-square w-[52%] -translate-x-1/2" style={{ x: sunX, y: sunY }}>
          <motion.div initial={{ y: '40%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 2.4, delay: 1.2, ease: [0.22, 1, 0.36, 1] }} className="size-full rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #fff, hsl(calc(var(--stage-h) + 36) 100% 80%) 30%, hsl(calc(var(--stage-h) + 18) 95% 60%) 70%)', boxShadow: '0 0 90px 10px hsl(calc(var(--stage-h) + 30) 95% 62% / 0.5)' }} />
        </motion.div>
        {/* two ridges, the nearer one sliding further than the farther one */}
        <motion.svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-x-[-8%] bottom-0 h-[34%] w-[116%]" style={{ x: farX }} aria-hidden="true">
          <path d="M0 200V120L50 96l36 34 52-58 44 52 40-30 56 70 50-44 42 40 30-24 50 40v40z" fill="hsl(calc(var(--stage-h) - 10) 60% 16% / 0.92)" />
        </motion.svg>
        <motion.svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-x-[-12%] bottom-0 h-[24%] w-[124%]" style={{ x: nearX, y: nearY }} aria-hidden="true">
          <path d="M0 200V110l60 34 46-52 56 56 44-38 60 46 52-60 40 40 42-30v98z" fill="#05050a" />
        </motion.svg>
        {/* a band of light that crosses now and then */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" style={{ animation: 'stage-sweep 7s ease-in-out 2.5s infinite' }} />
      </motion.div>
    </div>
  )
}
