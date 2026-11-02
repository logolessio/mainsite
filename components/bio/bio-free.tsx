import '@/components/editor/editor.css'

/**
 * What logoless.io/<name> shows when nobody has that name: a short page in black and white that offers it. `unavailable` is for a name the site keeps for itself
 * or that is not a name at all, so the page just says so.
 */
export function BioFree({ handle, signedIn, state }: { handle: string; signedIn: boolean; state: 'free' | 'unavailable' }) {
  const href = signedIn ? `/editor?claim=${encodeURIComponent(handle)}` : `/signup?claim=${encodeURIComponent(handle)}`
  return (
    <main className="ed fixed inset-0 z-40 grid place-items-center overflow-y-auto px-6 text-center">
      <div aria-hidden="true" className="speed pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[130vmax] -translate-x-1/2 -translate-y-1/2 opacity-50" />
      <div aria-hidden="true" className="tone pointer-events-none absolute inset-x-0 bottom-0 h-1/3" />
      <div className="relative max-w-xl">
        <p className="cap text-white/45">{state === 'free' ? 'free' : 'taken'}</p>
        <p className="mt-6 text-[0.9rem] text-white/40">logoless.io/</p>
        <p className="disp mt-1 text-[clamp(3rem,12vw,7.5rem)] break-all">{handle}</p>
        <p className="mt-5 text-[0.84rem] text-white/60">{state === 'free' ? "nobody has this one yet. it could be yours, and it's free." : "that name can't be used for a page."}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {state === 'free' && (
            <a href={href} className="btn btn-solid">
              claim it
            </a>
          )}
          <a href="/" className="btn">
            what&apos;s this?
          </a>
        </div>
      </div>
    </main>
  )
}
