import Link from 'next/link'
import { BrandIcon } from '@/components/brand-icon'
import { SEVENTEEN_DISCORD } from '@/components/seventeen/links'
import { Mark } from '@/components/seventeen/mark'
import { KINDS } from '@/lib/seventeen/packs'

const KIND_LINKS = KINDS.map((k) => ({ label: k === 'Film' ? 'Films' : k, href: `/?kind=${k}#packs` }))

/** The foot of every 17 page: the mark and what 17 is, the pages, the Discord, and where the clips and the film data come from. */
export function SeventeenFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/8">
      {/* the number once more, huge and cut off by the bottom edge */}
      <p aria-hidden className="s17-display pointer-events-none absolute -bottom-[0.3em] left-1/2 -translate-x-1/2 select-none text-[clamp(14rem,42vw,40rem)] leading-none text-white/[0.025]">
        17
      </p>
      <div className="relative mx-auto grid max-w-[1440px] gap-12 px-4 pb-10 pt-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-10">
        <div>
          <Link href="/" aria-label="17, home" className="inline-flex items-center gap-2.5">
            <Mark className="size-10" />
            <span className="s17-display text-[26px] text-white">17</span>
          </Link>
          <p className="mt-5 max-w-[320px] text-[13.5px] leading-relaxed text-white/50">Clean, high quality scenepacks of the films, series and anime people edit most. Free, no watermarks, new packs every week.</p>
        </div>
        <FooterCol title="Browse" links={[{ label: 'Every pack', href: '/#packs' }, { label: 'Top rated', href: '/#top' }, ...KIND_LINKS]} />
        <FooterCol title="Ask" links={[{ label: 'Request a pack', href: '/request' }, { label: 'Take a clip down', href: SEVENTEEN_DISCORD, external: true }]} />
        <div>
          <p className="s17-mono text-[10.5px] uppercase text-white/35">Community</p>
          <a href={SEVENTEEN_DISCORD} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-[#5865f2]/12 p-3 pr-5 ring-1 ring-[#5865f2]/30 transition-colors hover:bg-[#5865f2]/20">
            <span className="grid size-10 place-items-center rounded-xl bg-[#5865f2] text-white">
              <BrandIcon name="discord" className="size-5" />
            </span>
            <span>
              <span className="block text-[13.5px] font-semibold text-white">Join the Discord</span>
              <span className="block text-[11.5px] text-white/50">Downloads, requests, drops</span>
            </span>
          </a>
        </div>
      </div>
      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-3 border-t border-white/8 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
        <p className="s17-mono text-[10.5px] uppercase text-white/35">© {new Date().getFullYear()} 17</p>
        <p className="max-w-[760px] text-[11.5px] leading-relaxed text-white/35 md:text-right">
          Every clip belongs to its rights holders and is shared in short scenes for edits and commentary. Film and series details from OMDb. To have anything taken down, message us on the Discord.
        </p>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string; external?: boolean }[] }) {
  return (
    <div>
      <p className="s17-mono text-[10.5px] uppercase text-white/35">{title}</p>
      <ul className="mt-5 space-y-3">
        {links.map((l) => (
          <li key={l.label}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noreferrer" className="text-[14px] text-white/70 transition-colors hover:text-white">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="text-[14px] text-white/70 transition-colors hover:text-white">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
