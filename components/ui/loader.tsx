import { cn } from '@/lib/utils'

/**
 * The site's one loading look. A thin ring that turns (for buttons and small places) and, for a page or a panel, the ring with three soft
 * dots and a word under it. Everything waits a moment before it shows (`wait`), so a load that is quick never flashes a spinner.
 * Plain markup and CSS (see .loader-* in globals.css), so it works in server components and before the page's scripts have run.
 */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={cn('loader-ring inline-block size-4 shrink-0 rounded-full border-[1.5px] border-current border-r-transparent opacity-80', className)} />
  )
}

export function Loader({ label = 'Loading', className, wait = 180 }: { label?: string; className?: string; wait?: number }) {
  return (
    <div role="status" aria-live="polite" className={cn('loader-wait flex flex-col items-center justify-center gap-4 text-paper/70', className)} style={{ ['--wait' as string]: `${wait}ms` }}>
      <span className="relative grid size-11 place-items-center">
        <span aria-hidden="true" className="absolute inset-0 rounded-full border border-white/[0.08]" />
        <span aria-hidden="true" className="loader-ring absolute inset-0 rounded-full border-[1.5px] border-transparent border-t-paper/80" />
        <span aria-hidden="true" className="flex gap-1">
          {[0, 1, 2].map((n) => (
            <span key={n} className="loader-dot size-1 rounded-full bg-paper" style={{ animationDelay: `${n * 0.16}s` }} />
          ))}
        </span>
      </span>
      <span className="text-[13px] text-paper/45">{label}…</span>
    </div>
  )
}

/** A whole page that is on its way: the loader in the middle of the space the page will fill. */
export function PageLoader({ label, className }: { label?: string; className?: string }) {
  return <Loader label={label} className={cn('min-h-[60vh] w-full', className)} />
}

/**
 * A dashboard page that is on its way: the shape of a page (a heading and two panels) breathing quietly, with the loader over it, inside a
 * dashboard's frame (the sidebar and the top bar stay where they are).
 */
export function DashLoader({ label }: { label?: string }) {
  return (
    <div className="loader-wait relative" style={{ ['--wait' as string]: '120ms' }}>
      <div aria-hidden="true" className="mb-10 border-b border-line pb-8 md:mb-12 md:pb-10">
        <div className="sk h-11 w-56 rounded-2xl bg-white/[0.05] md:h-14 md:w-72" />
        <div className="sk mt-4 h-4 w-80 max-w-full rounded-pill bg-white/[0.035]" />
      </div>
      <div aria-hidden="true" className="grid gap-5">
        <div className="sk h-[180px] rounded-3xl border border-line bg-white/[0.025]" />
        <div className="sk h-[240px] rounded-3xl border border-line bg-white/[0.02]" />
      </div>
      <Loader label={label} wait={300} className="absolute inset-x-0 top-48" />
    </div>
  )
}
