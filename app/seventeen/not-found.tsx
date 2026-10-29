import Link from 'next/link'
import { PosterWall } from '@/components/seventeen/home'
import { PACKS } from '@/lib/seventeen/packs'

/** A pack address that does not exist on 17. */
export default function SeventeenNotFound() {
  return (
    <section className="relative isolate -mt-16 flex min-h-[80svh] flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-32 text-center">
      <PosterWall packs={PACKS.slice(30, 70)} columns={8} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_50%,rgb(0_0_0/0.95),rgb(0_0_0/0.7))]" />
      <p className="s17-display s17-shimmer text-[clamp(7rem,24vw,18rem)]">404</p>
      <p className="mt-6 text-[16px] text-white/60">That pack isn&apos;t here, or it has been taken down.</p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link href="/#packs" className="inline-flex h-12 items-center rounded-full bg-white px-6 text-[14px] font-semibold text-black">
          Every pack
        </Link>
        <Link href="/request" className="inline-flex h-12 items-center rounded-full bg-white/[0.07] px-6 text-[14px] font-semibold text-white ring-1 ring-white/15">
          Request it
        </Link>
      </div>
    </section>
  )
}
