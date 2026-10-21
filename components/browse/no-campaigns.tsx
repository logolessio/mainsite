import { TransitionLink } from '@/components/shell/transition-link'
import { cn } from '@/lib/utils'

/**
 * What a campaign list shows when nothing is live at all (not when a search finds nothing): a calm note for creators,
 * and a way in for brands. Used by the browse page, /reels and the cover strip on the marketing pages.
 */
export function NoCampaigns({ className, as: Heading = 'p' }: { className?: string; as?: 'h1' | 'h2' | 'p' }) {
  return (
    <div className={cn('mx-auto max-w-xl rounded-[calc(28px*var(--round,1))] border border-dashed border-line-strong px-6 py-16 text-center md:py-20', className)}>
      <Heading className="font-display text-3xl tracking-tight md:text-4xl">New campaigns are on their way</Heading>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-mute">Nothing is live right this minute. Check back soon: new campaigns show up here first.</p>
      <p className="mt-7 text-sm text-mute">
        Have something people should post about?{' '}
        <TransitionLink href="/for-brands" className="text-paper underline decoration-paper/30 underline-offset-4 transition-colors hover:decoration-paper">
          Launch a campaign
        </TransitionLink>
      </p>
    </div>
  )
}
