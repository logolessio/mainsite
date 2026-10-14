import { CONTAINER } from '@/lib/layout'
import { Reveal } from '@/components/motion/reveal'

/** One of our promises, said loudly: PayPal's own charges are on us, for deposits and for payouts. */
export function FeePromise({ audience = 'both' }: { audience?: 'brands' | 'clippers' | 'both' }) {
  const lines =
    audience === 'brands'
      ? ['Every dollar you add to your balance is a dollar you can spend.', 'No deposit fee, no top-up fee, no surprise at checkout.']
      : audience === 'clippers'
        ? ['Whatever you withdraw is exactly what arrives in your PayPal.', 'No withdrawal fee and no cut taken from what you earn.']
        : ['Brands are credited every dollar they add, and clippers receive every dollar they withdraw.', 'No deposit fee, no withdrawal fee, and nothing taken from what clippers earn.']
  return (
    <section aria-label="PayPal fees" className={`${CONTAINER} py-10 md:py-16`}>
      <Reveal className="grid gap-8 rounded-[2rem] border border-line-strong bg-white/[0.03] p-8 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-14 md:p-12">
        <div>
          <p className="text-sm text-paper/60">Our promise</p>
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
