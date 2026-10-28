import type { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import { ResourceLibrary } from '@/components/seventeen/resource-library'
import { SEVENTEEN_LINKS } from '@/components/seventeen/links'
import { RESOURCES } from '@/lib/seventeen/resources'

export const metadata: Metadata = { title: 'Free resources', description: 'Text animations, overlays and colour presets for edits, free from 17.' }

/** 17.logoless.io/resources: the free editing resources, in one panel with tabs, a search and tags. */
export default function ResourcesPage() {
  return (
    <>
      <section className="px-5 pb-14 pt-14 text-center md:pt-24">
        <a href={SEVENTEEN_LINKS.clip} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] py-[7px] pl-[15px] pr-3 text-[12px] text-white/66 transition-colors hover:border-white/20 hover:text-white">
          For editors and motion designers
          <ChevronRight className="size-3.5" />
        </a>
        <h1 data-no-shadow className="mx-auto mt-7 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-black uppercase leading-[0.92] tracking-[-0.045em] text-white">
          Free <span className="bg-[linear-gradient(90deg,#ff1f38,#ff2d96_30%,#9650ff_60%,#4678ff_82%,#4ba9dc)] bg-clip-text text-transparent">resources</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[520px] text-[13px] leading-relaxed text-white/55">Text animations, overlays and colour presets. Browse the library and drop any of them straight onto your timeline.</p>
      </section>
      <ResourceLibrary items={RESOURCES} />
    </>
  )
}
