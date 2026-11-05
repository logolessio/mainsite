'use client'

import '@/components/editor/editor.css'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="ed fixed inset-0 z-40 grid place-items-center overflow-y-auto px-6 text-center">
      <div className="rise max-w-md">
        <h1 className="disp text-[clamp(2.4rem,8vw,4.4rem)]">Something went wrong</h1>
        <p className="mt-4 text-[0.86rem] leading-[1.7] text-white/55">That one is on us. Reloading usually fixes it.</p>
        <button type="button" onClick={reset} className="btn btn-solid mt-8">
          Reload
        </button>
      </div>
    </main>
  )
}
