import type { Metadata } from 'next'
import '@/components/editor/editor.css'

export const metadata: Metadata = { title: 'Page not found | logoless', robots: { index: false } }

export default function NotFound() {
  return (
    <main className="ed fixed inset-0 z-40 grid place-items-center overflow-y-auto px-6 text-center">
      <div className="relative max-w-md">
        <p className="cap text-white/45">404</p>
        <p className="disp mt-5 text-[clamp(2.6rem,10vw,6rem)]">nothing here.</p>
        <p className="mt-5 text-[0.84rem] text-white/60">the link might be old, or mistyped.</p>
        <div className="mt-8 flex justify-center">
          <a href="/" className="btn btn-solid">
            go home
          </a>
        </div>
      </div>
    </main>
  )
}
