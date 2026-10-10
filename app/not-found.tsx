import { PillLink } from '@/components/motion/cta'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <p className="font-mono text-xs text-mute">Error 404</p>
        <h1 className="mt-4 font-display text-[28vw] leading-[0.8] md:text-[16vw]">Lost</h1>
        <p className="mx-auto mt-6 max-w-sm text-mute">That page does not exist or has moved.</p>
        <div className="mt-8 flex justify-center gap-3">
          <PillLink href="/">Home</PillLink>
          <PillLink href="/" variant="ghost">Campaigns</PillLink>
        </div>
      </div>
    </main>
  )
}
