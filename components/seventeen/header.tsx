'use client'

import { Menu, Search, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { SEVENTEEN_DISCORD } from '@/components/seventeen/links'
import { Mark } from '@/components/seventeen/mark'
import { OPEN_SEARCH, SearchPalette } from '@/components/seventeen/search'
import type { SearchItem } from '@/lib/seventeen/packs'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Browse', href: '/#packs' },
  { label: 'Top rated', href: '/#top' },
  { label: 'Request', href: '/request' },
]

/** The bar along the top of 17: the mark, the pages, the search and the Discord. It sits over the hero and frosts over once the page moves. */
export function SeventeenHeader({ items }: { items: SearchItem[] }) {
  const path = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [mac, setMac] = useState(true)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    setMac(/Mac|iPhone|iPad/.test(navigator.platform))
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => setOpen(false), [path])
  // the address the visitor sees is /request; inside the code it is /seventeen/request
  const here = (href: string) => href === '/request' && /\/request$/.test(path)

  return (
    <>
      <header className={cn('sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500', scrolled || open ? 'border-b border-white/8 bg-black/70 backdrop-blur-2xl backdrop-saturate-150' : 'border-b border-transparent')}>
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label="17, home" className="flex items-center gap-2.5">
            <Mark />
            <span className="s17-mono hidden text-[11px] uppercase text-white/55 sm:block">Scenepacks</span>
          </Link>
          <nav aria-label="17" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cn('rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors hover:bg-white/[0.06] hover:text-white', here(n.href) ? 'text-white' : 'text-white/60')}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH))}
              className="flex h-10 items-center gap-2.5 rounded-full bg-white/[0.06] pl-3.5 pr-3.5 text-[13px] text-white/50 ring-1 ring-white/10 transition-colors hover:bg-white/[0.09] hover:text-white/80 lg:w-64 lg:pr-2"
            >
              <Search className="size-4 shrink-0" />
              <span className="hidden lg:inline">Search {items.length} packs</span>
              <kbd className="s17-mono ml-auto hidden rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] text-white/50 lg:inline">{mac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            <a href={SEVENTEEN_DISCORD} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98] sm:px-5">
              <BrandIcon name="discord" className="size-[18px]" />
              <span className="hidden sm:inline">Join Discord</span>
            </a>
            <button type="button" aria-label={open ? 'Close the menu' : 'Open the menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center rounded-full text-white/80 ring-1 ring-white/12 md:hidden">
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
        {open && (
          <nav aria-label="17 menu" className="px-4 pb-4 sm:px-6 md:hidden">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="s17-display flex items-center border-b border-white/8 py-4 text-[28px] text-white/85">
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <SearchPalette items={items} />
    </>
  )
}
