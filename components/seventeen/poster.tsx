import type { CSSProperties } from 'react'
import type { Pack, PackArt } from '@/lib/seventeen/packs'
import { cn } from '@/lib/utils'

// film grain over every cover, so the flat gradients read as a print and not a screen
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

/** The picture part of a cover: the two colours and the shape in the light colour, under grain. Also the backdrop on a pack's page. */
export function PosterArt({ art, className }: { art: PackArt; className?: string }) {
  const a = art.accent
  return (
    <div aria-hidden className={cn('absolute inset-0 overflow-hidden', className)} style={{ background: `linear-gradient(165deg, ${art.from} 0%, ${art.to} 78%)` }}>
      {art.shape === 'orb' && (
        <>
          <div className="absolute left-1/2 top-[34%] size-[70%] -translate-1/2 rounded-full opacity-80 blur-2xl" style={{ background: `radial-gradient(circle, ${a}, transparent 68%)` }} />
          <div className="absolute left-1/2 top-[34%] size-[34%] -translate-1/2 rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, #fff 0%, ${a} 45%, transparent 72%)` }} />
        </>
      )}
      {art.shape === 'beam' && (
        <>
          <div className="absolute inset-x-0 top-[38%] h-[30%] -translate-y-1/2 opacity-70 blur-xl" style={{ background: `radial-gradient(50% 50% at 50% 50%, ${a}, transparent)` }} />
          <div className="absolute inset-x-[-10%] top-[38%] h-px" style={{ background: `linear-gradient(90deg, transparent, ${a} 30%, #fff 50%, ${a} 70%, transparent)`, boxShadow: `0 0 18px 3px ${a}` }} />
          <div className="absolute inset-x-[15%] top-[38%] h-[3px] -translate-y-px rounded-full bg-white blur-[1px]" />
        </>
      )}
      {art.shape === 'grid' && (
        <>
          <div className="absolute inset-x-[-60%] bottom-0 h-[120%] origin-bottom [transform:perspective(300px)_rotateX(56deg)] [mask-image:linear-gradient(to_top,#000_35%,transparent_90%)]" style={{ backgroundImage: `linear-gradient(${a}aa 1px, transparent 1px), linear-gradient(90deg, ${a}aa 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
          <div className="absolute inset-x-0 top-[44%] h-[22%] opacity-60 blur-2xl" style={{ background: `radial-gradient(50% 50% at 50% 100%, ${a}, transparent)` }} />
        </>
      )}
      {art.shape === 'rings' && (
        <div className="absolute left-1/2 top-[36%] size-[150%] -translate-1/2 opacity-70 [mask-image:radial-gradient(circle,#000_10%,transparent_60%)]" style={{ background: `repeating-radial-gradient(circle, ${a} 0 1px, transparent 1px 14px)` }} />
      )}
      {art.shape === 'slash' && (
        <>
          <div className="absolute left-[-30%] top-[20%] h-[22%] w-[160%] -rotate-[24deg] opacity-90" style={{ background: `linear-gradient(90deg, transparent, ${a} 40%, ${a}55 80%, transparent)` }} />
          <div className="absolute left-[-30%] top-[44%] h-[3%] w-[160%] -rotate-[24deg] bg-white/70" />
        </>
      )}
      {art.shape === 'dusk' && (
        <>
          <div className="absolute left-1/2 top-[42%] aspect-square w-[78%] -translate-1/2 rounded-full [mask-image:repeating-linear-gradient(to_bottom,#000_0_9px,transparent_9px_12px)]" style={{ background: `linear-gradient(to bottom, #fff 0%, ${a} 55%, ${art.from} 100%)` }} />
          <div className="absolute inset-x-0 top-[42%] h-[30%] opacity-50 blur-2xl" style={{ background: `radial-gradient(50% 50% at 50% 0%, ${a}, transparent)` }} />
        </>
      )}
      <div className="absolute inset-0 opacity-[0.22] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
    </div>
  )
}

/**
 * A pack's cover, 2:3 like a film poster: its picture when it has one, otherwise the drawn art with the title set in Schibsted Black and the 17 mark
 * in the corner. The type is sized to the card (container units), so the same cover works in the grid and on the pack's page.
 */
export function Poster({ pack, className, priority = false }: { pack: Pack; className?: string; priority?: boolean }) {
  if (pack.poster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={pack.poster} alt={pack.title} loading={priority ? 'eager' : 'lazy'} className={cn('absolute inset-0 size-full object-cover', className)} />
    )
  }
  const size = pack.title.length <= 8 ? 19 : pack.title.length <= 13 ? 15 : 12
  return (
    <div className={cn('absolute inset-0 [container-type:inline-size]', className)}>
      <PosterArt art={pack.art} />
      <div className="absolute inset-x-[7cqw] top-[6cqw] flex items-center justify-between font-sans text-[4.6cqw] font-medium uppercase tracking-[0.14em] text-white/75">
        <span>{pack.kind}</span>
        <span className="font-display text-[7cqw] font-black tracking-[-0.04em] text-white">17</span>
      </div>
      <div className="absolute inset-x-[7cqw] bottom-[7cqw]">
        <p
          className="font-display font-black uppercase leading-[0.88] tracking-[-0.045em] text-balance text-white"
          style={{ fontSize: `${size}cqw`, textShadow: '0 2px 18px rgb(0 0 0 / 0.5)' } as CSSProperties}
        >
          {pack.title}
        </p>
        <div className="mt-[4cqw] flex items-center gap-[3cqw] border-t border-white/25 pt-[3cqw] font-sans text-[4.2cqw] uppercase tracking-[0.08em] text-white/70">
          <span>{pack.quality}</span>
          {pack.year && <span className="ml-auto">{pack.year}</span>}
        </div>
      </div>
    </div>
  )
}
