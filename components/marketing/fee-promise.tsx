import { CONTAINER } from '@/lib/layout'
import { SITE } from '@/lib/site'
import { Reveal } from '@/components/motion/reveal'

/** One of our promises, said loudly: PayPal's own charges are on us, for deposits and for payouts. */
export function FeePromise({ audience = 'both' }: { audience?: 'brands' | 'clippers' | 'both' }) {
  const lines =
    audience === 'brands'
      ? ['Not only do we offer far cheaper rates compared to other sites, we also fully cover all transaction fees meaning that you get every penny of value you paid for.', 'We know how annoying it can be to discover, random, unwanted fees so we do our best to make funding campaigns as easy and stream-lined as possible.', `And your first ${SITE.freeFeeCampaigns} campaigns carry no platform fee from us either.`]
      : audience === 'clippers'
        ? ['Whatever you withdraw is the amount we send to your PayPal.', "We cover ALL PayPal transaction fees and don't take a single cut from your earnings."]
        : ['Brands are credited every dollar they add, and creators are sent every dollar they withdraw.', 'No deposit fee, no withdrawal fee, and nothing taken from what creators earn.']
  return (
    <section aria-label="PayPal fees" className={`${CONTAINER} py-10 md:py-16`}>
      <Reveal className="grid gap-8 rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.03] p-8 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-14 md:p-12">
        <div>
          <p className="text-sm text-paper/60">Promise</p>
          <h2 className="mt-4 font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.95] tracking-[-0.04em]">We pay PayPal&apos;s fees.</h2>
        </div>
        <div className="grid gap-4 text-[17px] leading-snug text-paper/70">
          {lines.map((l) => (
            <p key={l} className="border-t border-line pt-4">
              {l}
            </p>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
