import { ChevronRight } from 'lucide-react'
import { BrandIcon } from '@/components/brand-icon'
import { Catalog } from '@/components/seventeen/catalog'
import { SEVENTEEN_LINKS } from '@/components/seventeen/links'
import { newestPacks } from '@/lib/seventeen/packs'

/** 17.logoless.io: the promise, the Discord, and every pack in one searchable grid. */
export default function SeventeenHome() {
  return (
    <>
      <section className="relative px-5 pb-16 pt-14 text-center md:pb-20 md:pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[-80px] mx-auto h-[420px] max-w-[900px] bg-[radial-gradient(50%_50%_at_50%_40%,rgb(255_31_56/0.10),transparent_70%)]" />
        <a href={SEVENTEEN_LINKS.clip} className="relative inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] py-[7px] pl-[15px] pr-3 text-[12px] text-white/66 transition-colors hover:border-white/20 hover:text-white">
          Get paid for your edits
          <ChevronRight className="size-3.5" />
        </a>
        <h1 data-no-shadow className="s17-shimmer relative mx-auto mt-7 max-w-[1100px] font-display text-[clamp(2.3rem,5.4vw,4.6rem)] font-black uppercase leading-[0.92] tracking-[-0.045em]">
          Clean 4K scenepacks.
          <br />
          Free for every editor.
        </h1>
        <a href={SEVENTEEN_LINKS.discord} className="relative mt-9 inline-flex h-[46px] items-center gap-2.5 rounded-full border border-white/10 bg-[#111317]/50 px-[30px] text-[14px] font-semibold text-white transition-colors hover:border-white/25 hover:bg-[#16181d]">
          <BrandIcon name="discord" className="size-[18px]" />
          Join Discord
        </a>
      </section>
      <Catalog packs={newestPacks()} />
    </>
  )
}
