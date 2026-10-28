import Link from 'next/link'

/** A pack address that does not exist on 17. */
export default function SeventeenNotFound() {
  return (
    <section className="px-5 py-32 text-center">
      <p className="font-display text-[clamp(4rem,14vw,9rem)] font-black leading-none tracking-[-0.06em] text-white/90">404</p>
      <p className="mt-4 text-[13px] text-white/55">That pack isn&apos;t here, or it has been taken down.</p>
      <Link href="/" className="mt-7 inline-flex h-10 items-center rounded-full bg-white px-5 text-[12px] font-semibold text-black">
        Every pack
      </Link>
    </section>
  )
}
