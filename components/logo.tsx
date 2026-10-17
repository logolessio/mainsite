import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-logo
      src="/logo-sm.png"
      alt="logoless"
      width={347}
      height={260}
      decoding="async"
      className={cn('block h-11 w-auto md:h-[52px]', className)}
    />
  )
}
