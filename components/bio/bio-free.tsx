import '@/components/editor/editor.css'

/**
 * What logoless.io/<name> shows when nobody has that name: a short black page that offers it, set like the rest of the site (a big title inside hairline arches, a round
 * badge to claim it). `unavailable` is for a name the site keeps for itself or that is not a name at all, so the page just says so.
 */
export function BioFree({ handle, signedIn, state }: { handle: string; signedIn: boolean; state: 'free' | 'unavailable' }) {
  const href = signedIn ? `/editor?claim=${encodeURIComponent(handle)}` : `/signup?claim=${encodeURIComponent(handle)}`
  return (
    <main className="ed fixed inset-0 z-40 grid place-items-center overflow-y-auto px-6 text-center">
      <div className="relative w-full max-w-[40rem]">
        <p className="text-[0.74rem] text-white/55 italic">{state === 'free' ? 'this one is free' : 'this one is taken'}</p>
        <div className="relative mx-auto mt-8 w-[min(78vw,22rem)]">
          {[0, 1, 2].map((i) => (
            <span key={i} aria-hidden="true" className="absolute rounded-t-[999px] border" style={{ inset: `${-9 - i * 8}px`, borderColor: `rgb(255 255 255 / ${0.55 - i * 0.14})` }} />
          ))}
          <div className="relative flex aspect-[4/5] w-full flex-col items-center justify-end overflow-hidden rounded-t-[999px] border border-white/10 bg-[#0c0c0c] px-4 pb-10">
            <p className="text-[0.82rem] text-white/45">logoless.io/</p>
            <p className="disp mt-1 text-[clamp(2.6rem,11vw,5rem)] break-all text-[#ededed]">{handle}</p>
          </div>
        </div>
        <p className="mx-auto mt-14 max-w-[24rem] text-[0.8rem] leading-[1.75] text-white/70">{state === 'free' ? "nobody has this one yet. it could be yours, and it's free." : "that name can't be used for a page."}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {state === 'free' && (
            <a href={href} className="grid size-[6.4rem] place-items-center rounded-full bg-[#ededed] text-center text-[0.78rem] leading-[1.45] tracking-[0.1em] text-black uppercase transition-transform hover:scale-105">
              claim
              <br />
              it
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
