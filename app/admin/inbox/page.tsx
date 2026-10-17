import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader, Card } from '@/components/app/ui'
import { Badge, EmptyState } from '@/components/app/table'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { type Inquiry, listInquiries } from '@/lib/inquiries'
import { TOPIC_LABEL } from '@/lib/inquiry-topics'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Inbox | logoless', robots: { index: false } }

const FILTERS = [
  { id: 'open', label: 'To do' },
  { id: 'reports', label: 'Reports' },
  { id: 'messages', label: 'Messages' },
  { id: 'closed', label: 'Closed' },
]
const ago = (t: number) => {
  const s = Math.max(1, Math.floor(Date.now() / 1000) - t)
  return s < 3600 ? `${Math.max(1, Math.floor(s / 60))}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`
}

/** Messages and reports sent through the site. Newest activity first. */
export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  await pageAdmin()
  const f = (await searchParams).f ?? 'open'
  const all = await listInquiries()
  const rows: Inquiry[] = all.filter((i) => (f === 'closed' ? i.status === 'closed' : f === 'reports' ? i.kind === 'report' && i.status !== 'closed' : f === 'messages' ? i.kind === 'contact' && i.status !== 'closed' : i.status !== 'closed'))
  const fresh = all.filter((i) => i.status === 'new').length
  return (
    <>
      <PageHeader title="Inbox" sub={`Messages and reports sent through the site. ${fresh} waiting for a first look.`} />
      <GlassTabs label="Filter" value={FILTERS.some((x) => x.id === f) ? f : 'open'} tabs={FILTERS.map((x) => ({ id: x.id, label: x.label, href: `/admin/inbox?f=${x.id}` }))} className="mx-0 mb-6" />
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="Mail" title="Nothing here" body="New messages and reports will appear in this list." />
        </Card>
      ) : (
        <ul className="grid gap-3">
          {rows.map((i) => {
            const last = i.replies[i.replies.length - 1]
            const waiting = i.status === 'new' || (last?.by === 'you' && i.status !== 'closed')
            return (
              <li key={i.id} data-kb-row>
                <Link data-kb-focus href={`/admin/inbox/${i.id}`} className="block rounded-3xl border border-line p-5 transition-colors hover:border-line-strong hover:bg-white/[0.03]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="flex flex-wrap items-center gap-2 text-lg">
                      {waiting && <span aria-label="Needs a reply" className="size-2 rounded-full bg-paper" />}
                      {i.subject}
                      <Badge tone={i.kind === 'report' ? 'warn' : 'neutral'}>{TOPIC_LABEL[`${i.kind}:${i.topic}`] ?? i.kind}</Badge>
                    </p>
                    <span className="text-xs text-mute">{ago(i.updated)} ago</span>
                  </div>
                  <p className="mt-1 text-sm text-mute">
                    {i.name}
                    {i.handle ? ` (@${i.handle})` : ' (not signed in)'}
                    {i.target ? ` · about ${i.target.slice(0, 60)}` : ''}
                  </p>
                  <p className="mt-2 line-clamp-2 text-[15px] text-paper/75">{(last?.text ?? i.message).replace(/\s+/g, ' ')}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
