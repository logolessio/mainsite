'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <p className="font-mono text-xs text-mute">Something broke</p>
        <h1 className="mt-4 font-display text-8xl leading-[0.85]">Try again</h1>
        <button type="button" onClick={reset} className="mt-8 h-12 bg-paper px-6 text-sm font-medium text-ink hover:bg-paper/85">
          Reload this page
        </button>
      </div>
    </main>
  )
}
