import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-sm.png"
      alt="logoless"
      width={640}
      height={202}
      decoding="async"
      className={cn('block h-7 w-auto md:h-9', className)}
    />
  )
}
