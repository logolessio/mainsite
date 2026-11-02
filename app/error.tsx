'use client'

import '@/components/editor/editor.css'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="ed fixed inset-0 z-40 grid place-items-center overflow-y-auto px-6 text-center">
      <div className="relative max-w-md">
        <p className="cap text-white/45">something broke</p>
        <p className="disp mt-5 text-[clamp(2.6rem,10vw,6rem)]">try again.</p>
        <p className="mt-5 text-[0.84rem] text-white/60">that one's on us.</p>
        <button type="button" onClick={reset} className="btn btn-solid mt-8">
          reload
        </button>
      </div>
    </main>
  )
}
