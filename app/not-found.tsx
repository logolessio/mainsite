import type { Metadata } from 'next'
import '@/components/editor/editor.css'

export const metadata: Metadata = { title: 'Page not found | logoless', robots: { index: false } }

export default function NotFound() {
  return (
    <main className="ed fixed inset-0 z-40 grid place-items-center overflow-y-auto px-6 text-center">
      <div className="rise max-w-md">
        <p className="disp text-[clamp(4rem,14vw,8rem)]">404</p>
        <h1 className="mt-4 text-[1.05rem] font-medium">That page doesn&apos;t exist</h1>
        <p className="mt-3 text-[0.86rem] leading-[1.7] text-white/55">The link might be old or mistyped.</p>
        <div className="mt-8 flex justify-center">
          <a href="/" className="btn btn-solid">
            Go home
          </a>
        </div>
      </div>
    </main>
  )
}
