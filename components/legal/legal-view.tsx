import '@/components/editor/editor.css'
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
    <main className="ed fixed inset-0 z-40 overflow-y-auto">
      <header className="cap mx-auto flex h-16 w-full max-w-[46rem] items-center justify-between px-6 text-white/55">
        <a href="/" className="transition-colors hover:text-white">
          home
        </a>
        <a href="/legal" className="transition-colors hover:text-white">
          all policies
        </a>
      </header>
      <div className="mx-auto w-full max-w-[46rem] px-6 pt-10 pb-28">{children}</div>
    </main>
  )
}

export function LegalDocView({ doc }: { doc: LegalDoc }) {
  return (
    <Frame>
      <p className="cap text-white/40">legal · updated {SITE.legalUpdated}</p>
      <h1 className="disp mt-5 text-[clamp(2.4rem,7vw,4.4rem)]">{doc.title}</h1>
      <p className="mt-5 text-[0.9rem] text-white/55">{doc.summary}</p>
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
            <h2 className="disp text-[1.5rem]">{s.h}</h2>
            <div className="mt-4 grid gap-4 text-[0.86rem] leading-relaxed text-white/65">
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
      <p className="cap text-white/40">legal</p>
      <h1 className="disp mt-5 text-[clamp(2.4rem,7vw,4.4rem)]">the fine print</h1>
      <ul className="mt-12 border-b border-white/10">
        {LEGAL.map((d) => (
          <li key={d.slug} className="border-t border-white/10">
            <a href={`/legal/${d.slug}`} className="group grid gap-1 py-6 transition-colors hover:text-white">
              <span className="disp text-[1.6rem]">{d.title}</span>
              <span className="text-[0.8rem] text-white/50">{d.summary}</span>
            </a>
          </li>
        ))}
      </ul>
    </Frame>
  )
}
