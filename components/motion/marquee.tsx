import { cn } from '@/lib/utils'

export function Marquee({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex overflow-hidden', className)} aria-hidden="true">
      <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10">{children}</div>
      <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10">{children}</div>
    </div>
  )
}
