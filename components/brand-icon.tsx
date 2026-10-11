import { cn } from '@/lib/utils'

export type BrandName =
  | 'tiktok'
  | 'youtube'
  | 'instagram'
  | 'discord'
  | 'google'
  | 'apple'
  | 'twitch'
  | 'x'

export function BrandIcon({ name, className }: { name: BrandName | (string & {}); className?: string }) {
  const url = `url(/brands/${name}.svg)`
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-4 shrink-0 bg-current', className)}
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}

export const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  youtube: 'YouTube',
  instagram: 'Instagram',
}
