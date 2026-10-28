import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { BrandIcon } from '@/components/brand-icon'
import { SEVENTEEN_LINKS as L } from '@/components/seventeen/links'

type Col = { title: string; links: { label: string; href: string; external?: boolean }[] }

const COLS: Col[] = [
  { title: 'Explore', links: [{ label: 'Home', href: '/' }, { label: 'Resources', href: '/resources' }, { label: 'Request', href: '/request' }] },
  { title: 'Editors', links: [{ label: 'Get paid to clip', href: L.clip, external: true }, { label: 'Terms', href: L.terms, external: true }] },
  { title: 'Community', links: [{ label: 'Discord', href: L.discord, external: true }, { label: 'YouTube', href: L.youtube, external: true }, { label: 'Instagram', href: L.instagram, external: true }, { label: 'TikTok', href: L.tiktok, external: true }] },
  { title: 'logoless', links: [{ label: 'logoless.io', href: L.main, external: true }] },
]

/** The foot of every 17 page: four columns of links, then the year and the socials. */
export function SeventeenFooter() {
  return (
    <footer className="mx-auto max-w-[1300px] px-5 pb-10 pt-20 md:px-9">
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-[12px] text-white/45">{c.title}</p>
            <ul className="mt-5 space-y-3.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} className="inline-flex items-center gap-1 text-[13px] text-white/80 transition-colors hover:text-white">
                      {l.label}
                      <ArrowUpRight className="size-3 text-white/40" />
                    </a>
                  ) : (
                    <Link href={l.href} className="text-[13px] text-white/80 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-16 flex flex-col-reverse items-start justify-between gap-5 border-t border-white/8 pt-6 sm:flex-row sm:items-center">
        <p className="text-[12px] text-white/45">© {new Date().getFullYear()} 17 by logoless</p>
        <div className="flex items-center gap-2">
          {(['discord', 'youtube', 'instagram', 'tiktok'] as const).map((b) => (
            <a key={b} href={L[b]} aria-label={b} className="grid size-9 place-items-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-white/25 hover:text-white">
              <BrandIcon name={b} className="size-3.5" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
