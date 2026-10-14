'use client'

import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { useDesign } from '@/components/shell/design-provider'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Link2, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Reveal } from '@/components/motion/reveal'
import { Words } from '@/components/motion/words'
import { TransitionLink } from '@/components/shell/transition-link'
import { CONTAINER, EASE_OUT } from '@/lib/layout'
import { LEGAL, type LegalDoc } from '@/lib/legal'
import { readMinutes } from '@/lib/legal-read'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

/** Links in the text become real links, and a lead-in such as "Account data:" is set in bold. */
function Rich({ text }: { text: string }) {
  const lead = /^([A-Z][A-Za-z0-9 &/'’-]{2,42}):\s([\s\S]+)$/.exec(text)
  const body = lead ? lead[2].charAt(0).toUpperCase() + lead[2].slice(1) : text
  return (
    <>
      {lead && <strong className="font-medium text-paper">{lead[1]}. </strong>}
      {body.split(/(https?:\/\/[^\s)]+)/g).map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-words text-paper underline underline-offset-4">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

export function LegalDocView({ doc }: { doc: LegalDoc }) {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const { scrollEffects } = useDesign()
  const [active, setActive] = useState(slug(doc.sections[0]?.h ?? ''))
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState('')
  const idx = LEGAL.findIndex((d) => d.slug === doc.slug)
  const prev = idx > 0 ? LEGAL[idx - 1] : null
  const next = idx >= 0 && idx < LEGAL.length - 1 ? LEGAL[idx + 1] : null
  const minutes = useMemo(() => readMinutes(doc), [doc])

  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-25% 0px -65% 0px' })
    doc.sections.forEach((s) => {
      const el = document.getElementById(slug(s.h))
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [doc])

  const copy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${id}`)
      setCopied(id)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      /* the address bar link still works */
    }
  }

  const toc = (
    <ol className="grid">
      {doc.sections.map((s, i) => {
        const id = slug(s.h)
        const on = active === id
        return (
          <li key={s.h}>
            <a
              href={`#${id}`}
              onClick={() => {
                setActive(id)
                setOpen(false)
              }}
              className={cn('relative flex items-baseline gap-3 py-2 pl-5 text-sm transition-colors', on ? 'text-paper' : 'text-mute hover:text-paper')}
            >
              {on && <motion.span layoutId="legal-toc" transition={{ duration: 0.3, ease: EASE_OUT }} className="absolute top-1.5 bottom-1.5 left-0 w-px bg-paper" />}
              <span className="leading-snug">{s.h}</span>
            </a>
          </li>
        )
      })}
    </ol>
  )

  return (
    <main>
      {scrollEffects && <motion.div style={{ scaleX }} className="fixed inset-x-0 top-0 z-[60] h-px origin-left bg-paper" />}
      <header className={cn(CONTAINER, 'flex flex-col items-center pt-44 pb-16 text-center md:pt-60 md:pb-24')}>
        <Reveal y={10}>
          <p className="text-xs text-mute">Legal · Updated {SITE.legalUpdated}</p>
        </Reveal>
        <Words as="h1" immediate delay={0.1} text={doc.title} className="mt-8 max-w-4xl font-display text-5xl leading-[0.98] md:text-8xl" />
        <Reveal delay={0.4}>
          <p className="mx-auto mt-8 max-w-xl text-lg text-mute">{doc.summary}</p>
        </Reveal>
        <Reveal delay={0.55}>
          <p className="mt-6 font-mono text-xs text-mute">
            {minutes} min read · {doc.sections.length} sections
          </p>
        </Reveal>
      </header>

      <div className={cn(CONTAINER, 'grid gap-10 pb-32 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-20 xl:grid-cols-[280px_minmax(0,720px)] xl:justify-center')}>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="lg:hidden">
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex h-12 w-full items-center justify-between rounded-2xl border border-line-strong px-5 text-sm">
              On this page
              <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform', open && 'rotate-180')} />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }} className="overflow-hidden">
                  <div className="mt-2 rounded-2xl border border-line p-3">{toc}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="hidden border-l border-line lg:block">
            <p className="mb-3 pl-5 text-xs text-mute">On this page</p>
            {toc}
            <div className="mt-6 flex flex-col gap-2 pl-5 pt-5 text-sm">
              <button type="button" onClick={() => window.print()} className="inline-flex w-fit items-center gap-2 text-mute transition-colors hover:text-paper">
                <Printer aria-hidden="true" className="size-4" /> Print or save as PDF
              </button>
              <TransitionLink href="/legal" className="inline-flex w-fit items-center gap-2 text-mute transition-colors hover:text-paper">
                <ArrowLeft aria-hidden="true" className="size-4" /> All policies
              </TransitionLink>
            </div>
          </div>
        </aside>

        <article className="min-w-0">
          {doc.sections.map((s, i) => {
            const id = slug(s.h)
            return (
              <Reveal key={s.h} y={22} blur={false}>
                <section id={id} className="group/sec scroll-mt-28 border-t border-line py-12 first:border-t-0 first:pt-0 md:py-16">
                  <div className="flex items-start gap-5">
                    <h2 className="flex-1 font-display text-3xl leading-[1.05] md:text-5xl">{s.h}</h2>
                    <button type="button" onClick={() => copy(id)} aria-label={`Copy link to ${s.h}`} className="mt-2 grid size-9 shrink-0 place-items-center rounded-full text-mute opacity-0 transition-all group-hover/sec:opacity-100 hover:bg-paper/10 hover:text-paper focus-visible:opacity-100">
                      {copied === id ? <Check className="size-4" /> : <Link2 className="size-4" />}
                    </button>
                  </div>
                  <div className="mt-8 space-y-5 text-[17px] leading-[1.75] text-pretty text-paper/75 md:pl-11">
                    {s.p.map((t) => (
                      <p key={t}>
                        <Rich text={t} />
                      </p>
                    ))}
                  </div>
                </section>
              </Reveal>
            )
          })}

          <p className="mt-6 border-t border-line pt-10 text-sm text-mute">
            Questions? Contact <a className="text-paper underline underline-offset-4" href={`mailto:${SITE.emails.legal}`}>{SITE.emails.legal}</a>.
          </p>

          <nav aria-label="More policies" className="mt-10 grid gap-px overflow-hidden rounded-3xl bg-line sm:grid-cols-2">
            {prev ? (
              <TransitionLink href={`/legal/${prev.slug}`} className="group bg-ink p-7 transition-colors hover:bg-surface">
                <span className="flex items-center gap-2 font-mono text-xs text-mute">
                  <ArrowLeft aria-hidden="true" className="size-3.5 transition-transform group-hover:-translate-x-1" /> Previous
                </span>
                <span className="mt-3 block font-display text-2xl">{prev.title}</span>
              </TransitionLink>
            ) : (
              <span className="bg-ink" />
            )}
            {next ? (
              <TransitionLink href={`/legal/${next.slug}`} className="group bg-ink p-7 text-right transition-colors hover:bg-surface">
                <span className="flex items-center justify-end gap-2 font-mono text-xs text-mute">
                  Next <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="mt-3 block font-display text-2xl">{next.title}</span>
              </TransitionLink>
            ) : (
              <span className="bg-ink" />
            )}
          </nav>
        </article>
      </div>
    </main>
  )
}
