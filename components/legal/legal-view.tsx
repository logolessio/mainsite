import { PageHead, SiteFrame } from '@/components/site/site-frame'
import { LEGAL, LEGAL_GROUPS, type LegalDoc } from '@/lib/legal'
import { SITE } from '@/lib/site'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

/** Links in the text become real links, and a lead-in such as "Account data:" is set in bold. */
function Rich({ text }: { text: string }) {
  const lead = /^([A-Z][A-Za-z0-9 &/'’-]{2,42}):\s([\s\S]+)$/.exec(text)
  const body = lead ? lead[2].charAt(0).toUpperCase() + lead[2].slice(1) : text
  return (
    <>
      {lead && <strong className="font-medium text-white">{lead[1]}. </strong>}
      {body.split(/(https?:\/\/[^\s)]+)/g).map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-words text-white underline underline-offset-4">
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
  const others = LEGAL.filter((d) => d.group === doc.group && d.slug !== doc.slug)
  return (
    <SiteFrame current="/legal" wide>
      <a href="/legal" className="cap text-white/40 hover:text-white">
        ← all policies
      </a>
      <div className="mt-8 grid gap-12 lg:grid-cols-[15rem_1fr] lg:gap-16">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="cap text-white/40">{doc.group.toLowerCase()}</p>
          <nav aria-label="on this page" className="mt-4 border-y border-white/10 py-4 lg:border-y-0 lg:py-0">
            <p className="mb-2 text-[0.72rem] text-white/40">on this page</p>
            <ol className="grid gap-1.5 text-[0.82rem] text-white/55">
              {doc.sections.map((s) => (
                <li key={s.h}>
                  <a href={`#${slug(s.h)}`} className="transition-colors hover:text-white">
                    {s.h}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
        <div className="min-w-0 max-w-[44rem]">
          <p className="cap text-white/40">updated {SITE.legalUpdated}</p>
          <h1 className="disp mt-5 text-[clamp(2.4rem,6vw,4.2rem)]">{doc.title}</h1>
          <p className="mt-5 text-[0.92rem] text-white/60">{doc.summary}</p>
          <article className="mt-12 grid gap-12">
            {doc.sections.map((s) => (
              <section key={s.h} id={slug(s.h)} className="scroll-mt-24">
                <h2 className="disp text-[1.5rem]">{s.h}</h2>
                <div className="mt-4 grid gap-4 text-[0.88rem] leading-relaxed text-white/68">
                  {s.p.map((t, i) => (
                    <p key={i}>
                      <Rich text={t} />
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </article>
          <p className="mt-16 border-t border-white/10 pt-6 text-[0.8rem] text-white/45">
            questions about this? write to <a href={`mailto:${SITE.emails.legal}`} className="text-white underline underline-offset-4">{SITE.emails.legal}</a>.
          </p>
          {others.length > 0 && (
            <div className="mt-10">
              <p className="cap text-white/40">also in {doc.group.toLowerCase()}</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {others.map((d) => (
                  <li key={d.slug}>
                    <a href={`/legal/${d.slug}`} className="block border border-white/10 p-4 transition-colors hover:border-white/40">
                      <span className="block text-[0.9rem]">{d.title}</span>
                      <span className="mt-1 block text-[0.74rem] text-white/45">{d.summary}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </SiteFrame>
  )
}

export function LegalIndexView() {
  return (
    <SiteFrame current="/legal">
      <PageHead kicker="legal" title="the fine print" lead={`how ${SITE.name} works, what we keep about you and what isn't allowed on a page. written to be read. updated ${SITE.legalUpdated}.`} />
      {LEGAL_GROUPS.map((g) => (
        <section key={g} className="mt-14">
          <h2 className="cap text-white/40">{g}</h2>
          <ul className="mt-3 border-b border-white/10">
            {LEGAL.filter((d) => d.group === g).map((d) => (
              <li key={d.slug} className="border-t border-white/10">
                <a href={`/legal/${d.slug}`} className="group grid gap-1 py-5 transition-colors hover:text-white">
                  <span className="disp text-[1.45rem] transition-transform group-hover:translate-x-1">{d.title}</span>
                  <span className="text-[0.8rem] text-white/50">{d.summary}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </SiteFrame>
  )
}
