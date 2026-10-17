import { cn } from '@/lib/utils'

/** What a dashboard page looks like while it is on its way: a title, a line, a few figures and some rows. */
export function PageSkeleton({ rows = 4, figures = 3 }: { rows?: number; figures?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" role="status">
      <div className="mb-10 border-b border-line pb-8 md:mb-12 md:pb-10">
        <div className="skeleton h-12 w-2/3 max-w-md md:h-16" />
        <div className="skeleton mt-5 h-5 w-full max-w-xl" />
      </div>
      <div className={cn('grid gap-x-10 gap-y-8', figures >= 3 ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2')}>
        {Array.from({ length: figures }, (_, i) => (
          <div key={i} className="border-t border-line-strong pt-5">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton mt-6 h-14 w-48" />
          </div>
        ))}
      </div>
      <div className="mt-14 grid gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton h-20" style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
    </div>
  )
}
