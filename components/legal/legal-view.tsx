import { LEGAL, type LegalDoc } from '@/lib/legal'
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

/** The page shared by every legal document and the list of them: black and white, nothing around it. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 z-40 overflow-y-auto bg-[#050505] text-white [font-family:var(--font-f-geist),system-ui,sans-serif]">
      <header className="mx-auto flex h-16 w-full max-w-[46rem] items-center justify-between px-6 text-[0.84rem] text-white/55">
        <a href="/" className="transition-colors hover:text-white">
          logoless
        </a>
        <a href="/legal" className="transition-colors hover:text-white">
          All policies
        </a>
      </header>
      <div className="mx-auto w-full max-w-[46rem] px-6 pt-10 pb-28">{children}</div>
    </main>
  )
}

export function LegalDocView({ doc }: { doc: LegalDoc }) {
  return (
    <Frame>
      <p className="text-[0.8rem] tracking-[0.16em] text-white/40 uppercase">Legal · Updated {SITE.legalUpdated}</p>
      <h1 className="mt-5 text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.05] font-medium tracking-[-0.04em]">{doc.title}</h1>
      <p className="mt-5 text-[1.05rem] text-white/55">{doc.summary}</p>
      <ol className="mt-12 grid gap-1 border-y border-white/10 py-6 text-[0.9rem] text-white/55">
        {doc.sections.map((s) => (
          <li key={s.h}>
            <a href={`#${slug(s.h)}`} className="transition-colors hover:text-white">
              {s.h}
            </a>
          </li>
        ))}
      </ol>
      <article className="mt-12 grid gap-12">
        {doc.sections.map((s) => (
          <section key={s.h} id={slug(s.h)} className="scroll-mt-8">
            <h2 className="text-[1.35rem] font-medium tracking-[-0.02em]">{s.h}</h2>
            <div className="mt-4 grid gap-4 text-[0.98rem] leading-relaxed text-white/65">
              {s.p.map((t, i) => (
                <p key={i}>
                  <Rich text={t} />
                </p>
              ))}
            </div>
          </section>
        ))}
      </article>
    </Frame>
  )
}

export function LegalIndexView() {
  return (
    <Frame>
      <p className="text-[0.8rem] tracking-[0.16em] text-white/40 uppercase">Legal</p>
      <h1 className="mt-5 text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.05] font-medium tracking-[-0.04em]">The fine print</h1>
      <ul className="mt-12 border-b border-white/10">
        {LEGAL.map((d) => (
          <li key={d.slug} className="border-t border-white/10">
            <a href={`/legal/${d.slug}`} className="group grid gap-1 py-6 transition-colors hover:text-white">
              <span className="text-[1.25rem] font-medium tracking-[-0.02em]">{d.title}</span>
              <span className="text-[0.92rem] text-white/50">{d.summary}</span>
            </a>
          </li>
        ))}
      </ul>
    </Frame>
  )
}
