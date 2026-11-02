import { Lock } from 'lucide-react'

/** What a page shows when its owner made it private or for signed-in members only. Black, white and grey like everything else. */
export function BioPrivate({ handle, kind }: { handle: string; kind: 'private' | 'members' }) {
  return (
    <main className="fixed inset-0 z-40 grid place-items-center bg-[#050505] px-6 text-center text-white">
      <div className="max-w-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-white/15 bg-white/[0.04]">
          <Lock aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </span>
        <p className="mt-6 text-2xl font-medium tracking-[-0.03em]">{handle}</p>
        <p className="mt-2 text-[0.95rem] text-white/55">{kind === 'private' ? 'This page is private.' : 'Log in to logoless to see this page.'}</p>
        {kind === 'members' && (
          <a href={`/login?next=${encodeURIComponent(`/${handle}`)}`} className="mt-7 inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-medium text-black transition-opacity hover:opacity-85">
            Log in
          </a>
        )}
      </div>
    </main>
  )
}
