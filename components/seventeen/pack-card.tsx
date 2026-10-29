import { Star } from 'lucide-react'
import Link from 'next/link'
import { firstYear, poster, type Pack } from '@/lib/seventeen/packs'
import { cn } from '@/lib/utils'

/**
 * A pack's poster as a card: the quality and the IMDb rating on top, and on hover the poster lifts, catches a sweep of light and shows the
 * plot. The title and the year sit under it.
 */
export function PackCard({ pack, eager = false, className }: { pack: Pack; eager?: boolean; className?: string }) {
  const src = poster(pack, 360)
  return (
    <Link href={`/p/${pack.slug}`} className={cn('group block outline-none', className)}>
      <div className="s17-sheen relative aspect-[2/3] overflow-hidden rounded-[14px] bg-white/[0.04] shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)] ring-1 ring-white/10 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-1.5 group-hover:shadow-[0_28px_60px_-20px_rgb(255_31_56/0.35)] group-hover:ring-white/30 group-focus-visible:ring-2 group-focus-visible:ring-[#ff1f38]">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            srcSet={`${poster(pack, 240)} 240w, ${src} 360w, ${poster(pack, 540)} 540w`}
            sizes="(min-width: 1280px) 15vw, (min-width: 768px) 22vw, 45vw"
            alt={`${pack.title} poster`}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.06]"
          />
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          <span className="s17-mono rounded-md bg-black/60 px-1.5 py-[3px] text-[9.5px] font-medium uppercase text-white/90 ring-1 ring-white/10 backdrop-blur-md">{pack.quality}</span>
          {pack.imdbRating && (
            <span className="s17-mono inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-[3px] text-[10px] font-medium text-white ring-1 ring-white/10 backdrop-blur-md">
              <Star className="size-2.5 fill-[#ffc857] text-[#ffc857]" />
              {pack.imdbRating}
            </span>
          )}
        </div>
        <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black via-black/70 to-transparent p-3 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
          <p className="line-clamp-4 translate-y-2 text-[11.5px] leading-snug text-white/75 transition-transform duration-500 group-hover:translate-y-0">{pack.plot}</p>
          <p className="s17-mono mt-2.5 translate-y-2 text-[10px] uppercase text-[#ff4d6a] transition-transform duration-500 group-hover:translate-y-0">{pack.files.length} files · Open pack →</p>
        </div>
      </div>
      <p className="mt-3 truncate text-[13.5px] font-semibold tracking-[-0.01em] text-white/90 transition-colors group-hover:text-white">{pack.title}</p>
      <p className="s17-mono mt-0.5 text-[10.5px] uppercase text-white/40">
        {firstYear(pack)} · {pack.kind}
      </p>
    </Link>
  )
}
