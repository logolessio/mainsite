'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[#050505] px-6 text-center text-white">
      <div className="max-w-md">
        <p className="text-[0.8rem] tracking-[0.16em] text-white/40 uppercase">Something broke</p>
        <p className="mt-5 text-[clamp(2rem,7vw,3.4rem)] leading-[1.05] font-medium tracking-[-0.04em]">Try again</p>
        <button type="button" onClick={reset} className="mt-8 inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-medium text-black transition-opacity hover:opacity-85">
          Reload this page
        </button>
      </div>
    </main>
  )
}
