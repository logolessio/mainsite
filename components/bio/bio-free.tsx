import '@/components/editor/editor.css'

/**
 * What logoless.io/<name> shows when nobody has that name: a short black page that offers it, with a button to claim it. `unavailable` is for a name
 * the site keeps for itself or that is not a name at all, so the page just says so.
 */
export function BioFree({ handle, signedIn, state }: { handle: string; signedIn: boolean; state: 'free' | 'unavailable' }) {
  const href = signedIn ? `/editor?claim=${encodeURIComponent(handle)}` : `/signup?claim=${encodeURIComponent(handle)}`
  return (
    <main className="ed fixed inset-0 z-40 grid place-items-center overflow-y-auto px-6 text-center">
      <div className="rise w-full max-w-[34rem]">
        <p className="text-[0.82rem] text-white/50">{state === 'free' ? 'This name is free' : 'This name is not available'}</p>
        <div className="mx-auto mt-6 flex w-full max-w-[26rem] flex-col items-center rounded-[28px] border border-white/10 bg-[#0d0d0d] px-6 py-12 shadow-[var(--ed-lift)]">
          <p className="text-[0.84rem] text-white/45">logoless.io/</p>
          <h1 className="disp mt-1 text-[clamp(2.4rem,10vw,4.2rem)] break-all">{handle}</h1>
        </div>
        <p className="mx-auto mt-8 max-w-[24rem] text-[0.86rem] leading-[1.75] text-white/60">{state === 'free' ? "Nobody has this one yet. It could be yours, and it's free." : "That name can't be used for a page."}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {state === 'free' && (
            <a href={href} className="btn btn-solid">
              Claim it
            </a>
          )}
          <a href="/" className="btn">
            What&apos;s this?
          </a>
        </div>
      </div>
    </main>
  )
}
