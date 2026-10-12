import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-logo
      src="/logo-sm.png"
      alt="logoless"
      width={640}
      height={336}
      decoding="async"
      className={cn('block h-10 w-auto md:h-12', className)}
    />
  )
}
