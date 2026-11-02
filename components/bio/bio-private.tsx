import { Lock } from 'lucide-react'
import '@/components/editor/editor.css'

/** What a page shows when its owner made it private or for signed-in members only. Black, white and grey like everything else. */
export function BioPrivate({ handle, kind }: { handle: string; kind: 'private' | 'members' }) {
  return (
    <main className="ed fixed inset-0 z-40 grid place-items-center overflow-y-auto px-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center border border-white/25">
          <Lock aria-hidden="true" className="size-4" strokeWidth={1.5} />
        </span>
        <p className="disp mt-6 text-[2.2rem] break-all">{handle}</p>
        <p className="mt-3 text-[0.84rem] text-white/60">{kind === 'private' ? 'this page is private.' : 'log in to see this page.'}</p>
        {kind === 'members' && (
          <a href={`/login?next=${encodeURIComponent(`/${handle}`)}`} className="btn btn-solid mt-7">
            log in
          </a>
        )}
      </div>
    </main>
  )
}
