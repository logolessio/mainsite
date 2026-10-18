import type { Metadata } from 'next'
import { HeroVariantsEditor, ScanSite, TextRow } from '@/components/admin/text-list'
import { Disclosure } from '@/components/admin/disclosure'
import { Card, PageHeader } from '@/components/app/ui'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { HERO_VARIANTS_DEFAULT, HERO_VARIANTS_KEY } from '@/lib/copy-key'
import { db } from '@/lib/db'
import { pendingEdits } from '@/lib/text-pending'
import { pageAdmin } from '@/lib/user'
import { SectionTabs } from '@/components/app/section-tabs'

export const metadata: Metadata = { title: 'Site text | logoless', robots: { index: false } }

type Row = { key: string; original: string; page: string; override: string | null }
type PageCount = { page: string; n: number; edited: number }

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; edited?: string }> }) {
  await pageAdmin()
  const sp = await searchParams
  const q = (sp.q ?? '').trim().slice(0, 80)
  const pg = (sp.page ?? '').slice(0, 100)
  const onlyEdited = sp.edited === '1'
  const d = await db()
  const where: string[] = []
  const args: unknown[] = []
  if (q) {
    where.push('(r.original LIKE ?1 OR c.value LIKE ?1)')
    args.push(`%${q.replace(/[%_]/g, '')}%`)
  }
  if (pg) {
    where.push(`r.page = ?${args.length + 1}`)
    args.push(pg)
  }
  if (onlyEdited) where.push('c.value IS NOT NULL')
  const browsing = Boolean(q || pg || onlyEdited)
  const [rows, pages, hero] = await Promise.all([
    browsing
      ? d
          .prepare(`SELECT r.key, r.original, r.page, c.value AS override FROM content_registry r LEFT JOIN content c ON c.key = r.key ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY r.page, r.original LIMIT 400`)
          .bind(...args)
          .all<Row>()
      : Promise.resolve({ results: [] as Row[] }),
    d.prepare('SELECT r.page AS page, COUNT(*) AS n, SUM(CASE WHEN c.value IS NOT NULL THEN 1 ELSE 0 END) AS edited FROM content_registry r LEFT JOIN content c ON c.key = r.key GROUP BY r.page ORDER BY r.page').all<PageCount>(),
    d.prepare('SELECT value FROM content WHERE key = ?1').bind(HERO_VARIANTS_KEY).first<{ value: string }>(),
  ])
  const waiting = await pendingEdits()
  const total = pages.results.reduce((a, p) => a + p.n, 0)
  const edited = pages.results.reduce((a, p) => a + (p.edited ?? 0), 0)
  const chip = (on: boolean) => cn('inline-flex h-9 items-center rounded-pill border px-4 text-sm transition-colors duration-300', on ? 'border-white/[0.14] bg-white/[0.08] text-paper' : 'border-transparent text-paper/55 hover:text-paper')

  return (
    <>
      <SectionTabs group="site" />
      <PageHeader title="Site text" sub="Every sentence on the site, grouped by page. You can also click “Edit text” in the corner of any page and click the words themselves." actions={<ScanSite />} />

      <p className="mb-6 flex items-start gap-2.5 rounded-2xl border border-line px-5 py-4 text-[15px] text-mute">
        <span aria-hidden="true" className={`mt-2 size-2 shrink-0 rounded-pill ${waiting.length ? 'bg-amber-300' : 'bg-emerald-400'}`} />
        <span>
          {waiting.length === 0
            ? 'Everything you have edited is written into the code. New edits show on the site at once, and are written into the code by themselves within about ten minutes.'
            : `${waiting.length} edit${waiting.length === 1 ? ' is' : 's are'} showing from the editor and waiting to be written into the code (about ten minutes). A sentence built from live numbers cannot be placed automatically and keeps working from the editor.`}
        </span>
      </p>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/text">
        <input name="q" defaultValue={q} placeholder="Search all text" aria-label="Search all text" className="h-11 w-full rounded-pill border border-line-strong bg-ink/80 px-5 text-sm focus:outline-none sm:w-96" />
        {pg && <input type="hidden" name="page" value={pg} />}
        <button className="h-11 rounded-pill bg-paper px-6 text-sm font-medium text-ink">Search</button>
      </form>
      <div className="mb-8 flex flex-wrap items-center gap-1.5">
        <Link href="/admin/text" className={chip(!browsing)}>
          By page <span className="ml-2 text-paper/40">{pages.results.length}</span>
        </Link>
        <Link href="/admin/text?edited=1" className={chip(onlyEdited && !pg && !q)}>
          Edited <span className="ml-2 text-paper/40">{edited}</span>
        </Link>
        <span className="ml-auto text-sm text-mute">{total.toLocaleString()} sentences</span>
      </div>

      {!browsing ? (
        <>
          {pages.results.length === 0 ? (
            <Card>
              <p className="text-sm text-mute">No text found yet. Press “Scan the site for text” and give it a minute. Legal pages are not editable here on purpose: change those in the code so every edit is reviewed.</p>
            </Card>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pages.results.map((p) => (
                <li key={p.page} data-kb-row>
                  <Link data-kb-focus href={`/admin/text?page=${encodeURIComponent(p.page)}`} className="group flex items-center gap-4 rounded-3xl border border-line bg-black/45 px-5 py-4 transition-colors duration-300 hover:border-line-strong hover:bg-white/[0.04]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px]">{p.page === '/' ? 'Home page' : p.page || 'Everywhere'}</span>
                      <span className="mt-0.5 block text-[13px] text-mute">
                        {p.n} {p.n === 1 ? 'sentence' : 'sentences'}
                        {p.edited > 0 && <span className="text-amber-300"> · {p.edited} edited</span>}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-paper/30 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-paper/70" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Disclosure className="mt-8" title="Home page headline" sub="One line is picked at random each visit, along with three greetings.">
            <p className="mb-3 text-sm text-mute">The greetings are “welcome to logoless”, “browse N campaigns” and “explore our campaigns”. One headline per line.</p>
            <HeroVariantsEditor value={hero?.value ?? HERO_VARIANTS_DEFAULT.join('\n')} isDefault={!hero} />
          </Disclosure>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-mute">
            {pg ? <span className="text-paper">{pg}</span> : onlyEdited ? 'Sentences you have edited' : `Results for “${q}”`} · {rows.results.length}
            {rows.results.length >= 400 ? '+ (showing the first 400, narrow it down)' : ''}
          </p>
          {rows.results.length === 0 ? (
            <Card>
              <p className="text-sm text-mute">Nothing matches.</p>
            </Card>
          ) : (
            <ul>{rows.results.map((r) => <TextRow key={r.key} item={r} />)}</ul>
          )}
        </>
      )}
    </>
  )
}
