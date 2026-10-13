import type { Metadata } from 'next'
import { SectionTabs } from '@/components/app/section-tabs'
import { HeroVariantsEditor, ScanSite, TextRow } from '@/components/admin/text-list'
import { Card, PageHeader } from '@/components/app/ui'
import { HERO_VARIANTS_DEFAULT, HERO_VARIANTS_KEY } from '@/lib/copy-key'
import { db } from '@/lib/db'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Site text | logoless', robots: { index: false } }

type Row = { key: string; original: string; page: string; override: string | null }

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await pageAdmin()
  const sp = await searchParams
  const q = (sp.q ?? '').trim().slice(0, 80)
  const pg = (sp.page ?? '').slice(0, 100)
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
  const [rows, pages, hero] = await Promise.all([
    d
      .prepare(`SELECT r.key, r.original, r.page, c.value AS override FROM content_registry r LEFT JOIN content c ON c.key = r.key ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY r.page, r.original LIMIT 400`)
      .bind(...args)
      .all<Row>(),
    d.prepare('SELECT page, COUNT(*) AS n FROM content_registry GROUP BY page ORDER BY page').all<{ page: string; n: number }>(),
    d.prepare('SELECT value FROM content WHERE key = ?1').bind(HERO_VARIANTS_KEY).first<{ value: string }>(),
  ])

  return (
    <>
      <SectionTabs group="content" />
      <PageHeader title="Site text" sub="Every sentence we know about. You can also click “Edit text” in the corner of any page and click the words themselves." actions={<ScanSite />} />

      <Card title="Home page headline" className="mb-8">
        <p className="mb-3 text-sm text-mute">One line is picked at random each visit (along with the logo and three greetings: “welcome to logoless”, “browse N campaigns”, “explore our campaigns”). One per line.</p>
        <HeroVariantsEditor value={hero?.value ?? HERO_VARIANTS_DEFAULT.join('\n')} isDefault={!hero} />
      </Card>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/text">
        <input name="q" defaultValue={q} placeholder="Search text" className="h-10 w-72 rounded-full border border-line-strong bg-ink/80 px-4 text-sm focus:outline-none" />
        <select name="page" defaultValue={pg} className="h-10 rounded-full border border-line-strong bg-ink/80 px-4 text-sm">
          <option value="">All pages</option>
          {pages.results.map((p) => (
            <option key={p.page} value={p.page}>
              {p.page} ({p.n})
            </option>
          ))}
        </select>
        <button className="h-10 rounded-full bg-paper px-5 text-sm font-medium text-ink">Filter</button>
      </form>

      {rows.results.length === 0 ? (
        <Card>
          <p className="text-sm text-mute">No text found yet. Press “Scan the site for text” and give it a minute. Legal pages are not editable here on purpose: change those in the code so every edit is reviewed.</p>
        </Card>
      ) : (
        <ul>{rows.results.map((r) => <TextRow key={r.key} item={r} />)}</ul>
      )}
    </>
  )
}
