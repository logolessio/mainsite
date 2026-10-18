'use client'

import { ArrowUpRight } from 'lucide-react'
import { BrandIcon, PLATFORM_LABEL } from '@/components/brand-icon'
import { useCampaignModal } from '@/components/campaign/campaign-modal'
import { FadeImg } from '@/components/ui/fade-img'
import { type Campaign, usd } from '@/lib/campaigns'

/**
 * The list layout (Design, Layout): one row per campaign with the cover on the left and the details beside it, so a person can compare
 * rates, platforms and what is left without opening anything. Pressing the row opens the campaign, exactly as a cover does.
 */
export function CampaignRow({ campaign, priority }: { campaign: Campaign; priority?: boolean }) {
  const { open } = useCampaignModal()
  const left = Math.max(0, Math.min(100, campaign.budgetLeftPct ?? 100))
  return (
    <button
      type="button"
      onClick={() => open(campaign)}
      aria-label={`${campaign.title} by ${campaign.creator}. ${usd(campaign.ratePer1k, 2)} per 1,000 views. Open campaign.`}
      className="group/row flex w-full items-center gap-4 rounded-[calc(22px*var(--round,1))] border border-line bg-white/[0.02] p-2.5 pr-4 text-left transition-[background-color,border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:bg-white/[0.05] md:gap-6 md:p-3 md:pr-6"
    >
      <span data-vt-cover={campaign.id} className="relative block size-20 shrink-0 overflow-hidden rounded-[calc(14px*var(--round,1))] bg-surface md:size-28">
        <FadeImg src={campaign.cover} alt="" loading={priority ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full scale-[1.07] object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover/row:scale-[1.14]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[1.35rem] leading-tight text-paper md:text-[1.7rem]">{campaign.title}</span>
        <span className="mt-1 block truncate text-sm text-paper/60 md:text-[15px]">
          {campaign.creator} · {campaign.type}
        </span>
        <span className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-paper/55">
          <span className="flex items-center gap-2">
            {campaign.platforms.map((p) => (
              <span key={p} title={PLATFORM_LABEL[p]} className="flex items-center">
                <BrandIcon name={p} className="size-3.5 text-paper/70" />
                <span className="sr-only">{PLATFORM_LABEL[p]}</span>
              </span>
            ))}
          </span>
          <span className="text-paper/80 sm:hidden">{usd(campaign.ratePer1k, campaign.ratePer1k % 1 ? 2 : 0)} per 1K</span>
          {campaign.endsOn && <span>Ends {campaign.endsOn}</span>}
          <span className="flex items-center gap-2" role="img" aria-label={`${left}% of the budget left`}>
            <span className="relative block h-1 w-16 overflow-hidden rounded-pill bg-white/15">
              <span style={{ width: `${left}%` }} className="absolute inset-y-0 left-0 rounded-pill bg-white/85" />
            </span>
            {left}% left
          </span>
        </span>
      </span>
      <span className="hidden shrink-0 text-right sm:block">
        <span className="block font-display text-[1.7rem] leading-none tabular-nums md:text-[2.1rem]">{usd(campaign.ratePer1k, campaign.ratePer1k % 1 ? 2 : 0)}</span>
        <span className="mt-1 block text-[12px] text-paper/50">per 1,000 views</span>
      </span>
      <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-paper/40 transition-[translate,color] duration-300 group-hover/row:-translate-y-0.5 group-hover/row:translate-x-0.5 group-hover/row:text-paper" />
    </button>
  )
}
