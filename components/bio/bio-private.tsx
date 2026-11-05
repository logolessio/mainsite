import { Lock } from 'lucide-react'
import '@/components/editor/editor.css'

/** What a page shows when its owner made it private or for signed-in members only. Black, white and grey like everything else. */
export function BioPrivate({ handle, kind }: { handle: string; kind: 'private' | 'members' }) {
  return (
    <main className="ed fixed inset-0 z-40 grid place-items-center overflow-y-auto px-6 text-center">
      <div className="rise max-w-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-white/15 bg-white/[0.04]">
          <Lock aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </span>
        <h1 className="disp mt-6 text-[2.2rem] break-all">{handle}</h1>
        <p className="mt-3 text-[0.86rem] text-white/55">{kind === 'private' ? 'This page is private.' : 'Log in to see this page.'}</p>
        {kind === 'members' && (
          <a href={`/login?next=${encodeURIComponent(`/${handle}`)}`} className="btn btn-solid mt-7">
            Log in
          </a>
        )}
      </div>
    </main>
  )
}
