import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Page not found | logoless', robots: { index: false } }

export default function NotFound() {
  return (
    <main className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[#050505] px-6 text-center text-white">
      <div className="max-w-md">
        <p className="text-[0.8rem] tracking-[0.16em] text-white/40 uppercase">Error 404</p>
        <p className="mt-5 text-[clamp(2rem,7vw,3.4rem)] leading-[1.05] font-medium tracking-[-0.04em]">We can&apos;t find that page</p>
        <div className="mt-8 flex justify-center">
          <a href="/" className="inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-medium text-black transition-opacity hover:opacity-85">
            Go home
          </a>
        </div>
      </div>
    </main>
  )
}
