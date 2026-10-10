import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-sm.png"
      alt="logoless"
      width={460}
      height={246}
      decoding="async"
      className={cn('block h-9 w-auto md:h-11', className)}
    />
  )
}
