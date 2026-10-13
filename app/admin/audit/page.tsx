import type { Metadata } from 'next'
import { SectionTabs } from '@/components/app/section-tabs'
import { when } from '@/lib/format'
import { Badge } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { verifyAudit, verifyContent } from '@/lib/chain'
import { db } from '@/lib/db'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Audit log | logoless', robots: { index: false } }

type A = { id: number; actor_email: string; action: string; target: string | null; detail: string | null; created_at: number }
type V = { id: number; key: string; old_value: string | null; new_value: string; editor_email: string; reason: string | null; created_at: number; original: string | null }

export default async function Page() {
  await pageAdmin()
  const d = await db()
  const [chainA, chainV, actions, texts] = await Promise.all([
    verifyAudit(),
    verifyContent(),
    d.prepare('SELECT id, actor_email, action, target, detail, created_at FROM audit_log ORDER BY id DESC LIMIT 150').all<A>(),
    d
      .prepare(
        `SELECT v.id, v.key, v.old_value, v.new_value, v.editor_email, v.reason, v.created_at, r.original
         FROM content_versions v LEFT JOIN content_registry r ON r.key = v.key ORDER BY v.id DESC LIMIT 150`,
      )
      .all<V>(),
  ])

  return (
    <>
      <SectionTabs group="system" />
      <PageHeader title="Audit log" sub="Every admin action and every text change. Each row is chained to the one before it, so a deleted or altered row shows up here." />
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {[
          { name: 'Admin actions', c: chainA },
          { name: 'Text changes', c: chainV },
        ].map(({ name, c }) => (
          <Card key={name}>
            <p className="flex items-center justify-between gap-3">
              <span>{name}</span>
              <Badge tone={c.ok ? 'good' : 'bad'}>{c.ok ? 'chain intact' : `BROKEN at #${c.brokenAt}`}</Badge>
            </p>
            <p className="mt-1 text-xs text-mute">{c.rows} entries checked</p>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 font-display text-3xl">Text changes</h2>
      <Card className="mb-10">
        {texts.results.length === 0 ? (
          <p className="text-sm text-mute">No text has been changed yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {texts.results.map((v) => (
              <li key={v.id} className="py-3 text-sm">
                <p className="flex flex-wrap items-center gap-x-3 text-xs text-mute">
                  <span>{when(v.created_at)}</span>
                  <span>{v.editor_email}</span>
                  {v.reason && <span>“{v.reason}”</span>}
                </p>
                <p className="mt-1 text-mute line-through decoration-signal/50">{v.old_value ?? v.original ?? '(original wording)'}</p>
                <p className="mt-0.5">{v.new_value}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <h2 className="mb-3 font-display text-3xl">Admin actions</h2>
      <Card>
        {actions.results.length === 0 ? (
          <p className="text-sm text-mute">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {actions.results.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5 text-sm">
                <span className="w-44 shrink-0 text-xs text-mute">{when(a.created_at)}</span>
                <span className="w-48 shrink-0 truncate text-xs">{a.actor_email}</span>
                <span className="font-mono text-xs">{a.action}</span>
                <span className="min-w-0 truncate text-xs text-mute">{[a.target, a.detail].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
