'use client'

import { Reveal } from '@/components/motion/reveal'
import { Words } from '@/components/motion/words'
import { T } from '@/components/shell/copy-provider'
import { CONTAINER } from '@/lib/layout'
import { cn } from '@/lib/utils'

/** A statement on the left and what it means on the right. `n`, `label` and `flip` are accepted and ignored so older pages still compile. */
export function SplitBeat({ title, children, list }: { n?: string; label?: string; title: string; children: React.ReactNode; list?: string[]; flip?: boolean }) {
  return (
    <section className={cn(CONTAINER, 'border-t border-line py-20 md:py-32')}>
      <div className="grid gap-8 md:grid-cols-12 md:gap-10">
        <Words as="h3" align="left" text={title} className="font-display text-4xl leading-[0.98] tracking-[-0.04em] md:col-span-5 md:text-[4.2rem]" />
        <div className="md:col-span-6 md:col-start-7">
          <Reveal delay={0.1} className="max-w-xl text-pretty text-lg leading-relaxed text-paper/60 md:text-xl">
            {children}
          </Reveal>
          {list && (
            <ul className="mt-10 max-w-xl border-b border-line">
              {list.map((l, i) => (
                <Reveal key={l} delay={0.15 + i * 0.05} blur={false}>
                  <li className="border-t border-line py-4 text-lg text-paper/85">
                    <T>{l}</T>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

/** A few big numbers, each on its own hairline. They count up when they scroll into view. */
export function StatRow({ stats }: { stats: { value: string; label: string; note?: string }[] }) {
  return (
    <section className={cn(CONTAINER, 'py-20 md:py-32')}>
      <ul className={cn('grid gap-12 md:gap-10', stats.length === 4 ? 'md:grid-cols-4' : stats.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} blur={false}>
            <li className="border-t border-line pt-6">
              <p className="font-display text-[clamp(4.5rem,9vw,8.5rem)] leading-[0.9] tracking-[-0.05em]">{s.value}</p>
              <p className="mt-6 text-xl"><T>{s.label}</T></p>
              {s.note && <p className="mt-2 max-w-[28ch] text-[15px] leading-snug text-paper/50"><T>{s.note}</T></p>}
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

export type Step = { title: string; body: string; detail?: string[] }

/** A heading on the left and a list of points on the right, each on a hairline. Used for steps, answers and promises alike. */
export function Steps({ title, steps }: { eyebrow?: string; title: string; steps: Step[] }) {
  return (
    <section className={cn(CONTAINER, 'border-t border-line py-24 md:py-40')}>
      <div className="grid gap-12 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-5">
          <div className="md:sticky md:top-36">
            <Words as="h2" align="left" text={title} className="max-w-[12ch] font-display text-5xl leading-[0.95] tracking-[-0.04em] md:text-[5rem]" />
          </div>
        </div>
        <ol className="border-b border-line md:col-span-6 md:col-start-7">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={Math.min(i, 3) * 0.05} blur={false}>
              <li className="border-t border-line py-9 md:py-11">
                <h3 className="font-display text-3xl leading-[1.05] tracking-[-0.03em] md:text-4xl"><T>{s.title}</T></h3>
                <p className="mt-4 max-w-lg text-pretty text-lg leading-relaxed text-paper/60"><T>{s.body}</T></p>
                {s.detail && (
                  <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-paper/45">
                    {s.detail.map((d, k) => (
                      <span key={d}>
                        {k > 0 && <span aria-hidden="true">  ·  </span>}
                        <T>{d}</T>
                      </span>
                    ))}
                  </p>
                )}
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/** Two columns set side by side: who gets what. */
export function Compare({ left, right }: { left: { title: string; items: string[] }; right: { title: string; items: string[] } }) {
  return (
    <section className={cn(CONTAINER, 'border-t border-line py-24 md:py-40')}>
      <div className="grid gap-20 md:grid-cols-2 md:gap-10">
        {[left, right].map((c, k) => (
          <Reveal key={c.title} delay={k * 0.1}>
            <p className="font-display text-5xl leading-none tracking-[-0.04em] md:text-[4.5rem]"><T>{c.title}</T></p>
            <ul className="mt-12 border-b border-line">
              {c.items.map((it) => (
                <li key={it} className="border-t border-line py-4 text-lg text-paper/75">
                  <T>{it}</T>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/** Short answers or promises: the same list as Steps. */
export function Principles({ title, items }: { eyebrow?: string; title: string; items: { title: string; body: string }[] }) {
  return <Steps title={title} steps={items} />
}
