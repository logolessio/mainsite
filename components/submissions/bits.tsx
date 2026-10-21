'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { cn } from '@/lib/utils'

/** 1234 → 1.2K, 1234567 → 1.2M. */
export const compact = (n: number | null | undefined) => {
  const v = n ?? 0
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (v >= 10_000) return `${Math.round(v / 1000)}K`
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(v)
}

export const PLATFORM_LABEL: Record<string, string> = { tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram', x: 'X' }

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  return <BrandIcon name={platform} className={className} />
}

/** A round picture of a person, with their first letter while it loads or when there is none. */
export function Face({ src, name, size = 28, className }: { src: string | null; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-pill bg-raised font-medium ring-1 ring-white/15', className)} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {(name.trim()[0] ?? '?').toUpperCase()}
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      )}
    </span>
  )
}

/** Small read-only stars: the average, filled to the tenth. */
export function StarsAverage({ avg, className, size = 12 }: { avg: number; className?: string; size?: number }) {
  return (
    <span className={cn('relative inline-flex', className)} aria-hidden="true">
      <span className="flex gap-px text-white/25">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} style={{ width: size, height: size }} className="fill-current" strokeWidth={0} />)}
      </span>
      <span className="absolute inset-0 flex gap-px overflow-hidden text-paper" style={{ width: `${(Math.max(0, Math.min(5, avg)) / 5) * 100}%` }}>
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} style={{ width: size, height: size }} className="shrink-0 fill-current" strokeWidth={0} />)}
      </span>
    </span>
  )
}

/** A soft moving sheen for things that are on their way. */
export function Shimmer({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <motion.span
        className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
        animate={{ x: ['0%', '400%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </span>
  )
}
