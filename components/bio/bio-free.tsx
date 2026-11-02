/**
 * What logoless.io/<name> shows when nobody has that name: a short page in black and white that offers it. `taken` is for a name the site keeps for itself or
 * that is not a name at all, so the page just says so.
 */
export function BioFree({ handle, signedIn, state }: { handle: string; signedIn: boolean; state: 'free' | 'unavailable' }) {
  const href = signedIn ? `/editor?claim=${encodeURIComponent(handle)}` : `/signup?claim=${encodeURIComponent(handle)}`
  return (
    <main className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[#050505] px-6 text-center text-white [font-family:var(--font-geist-sans,system-ui,sans-serif)]">
      <div className="max-w-md">
        <p className="text-[0.8rem] tracking-[0.16em] text-white/40 uppercase">{state === 'free' ? 'Available' : 'Not available'}</p>
        <p className="mt-5 text-[clamp(2rem,7vw,3.4rem)] leading-[1.05] font-medium tracking-[-0.04em] break-all">
          <span className="text-white/40">logoless.io/</span>
          {handle}
        </p>
        <p className="mt-4 text-[0.95rem] text-white/55">{state === 'free' ? 'Nobody has this page yet. Make it yours, free.' : 'This name cannot be used for a page.'}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {state === 'free' && (
            <a href={href} className="inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-medium text-black transition-opacity hover:opacity-85">
              Claim it
            </a>
          )}
          <a href="/" className="inline-flex h-11 items-center rounded-full border border-white/20 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10">
            What is logoless
          </a>
        </div>
      </div>
    </main>
  )
}
