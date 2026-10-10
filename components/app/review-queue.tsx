'use client'

import { CheckCircle2, ExternalLink, Flag, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Select, Textarea } from '@/components/ui/fields'
import { ActionButton, Card } from './ui'
import { Badge, EmptyState } from './table'

export type QueueItem = {
  id: string
  clipper: string
  campaign: string
  platform: string
  url: string
  views: number
  botScore: number // 0..1
  briefFlags: string[]
}

export function ReviewQueue() {
  // TODO(backend): GET /api/admin/submissions?status=pending
  const [items, setItems] = useState<QueueItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const current = items.find((i) => i.id === selected) ?? items[0]

  const decide = (_decision: 'approve' | 'reject' | 'flag') => {
    if (!current) return
    // TODO(backend): POST /api/admin/submissions/:id/decision { decision: _decision, reason }
    setItems((s) => s.filter((i) => i.id !== current.id))
    setSelected(null)
    setReason('')
  }

  if (items.length === 0)
    return (
      <Card>
        <EmptyState icon="CheckCircle2" title="Queue is clear" body="Nothing is waiting for review." />
      </Card>
    )

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <ul className="border border-line bg-surface/80 rounded-2xl">
        {items.map((i) => (
          <li key={i.id}>
            <button
              type="button"
              onClick={() => setSelected(i.id)}
              aria-current={current?.id === i.id}
              className="w-full border-b border-line px-5 py-4 text-left transition-colors hover:bg-paper/[0.04] aria-[current=true]:bg-paper/[0.07]"
            >
              <span className="block">@{i.clipper}</span>
              <span className="block text-sm text-mute">
                {i.campaign} · {i.platform}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <Card title={`@${current.clipper}`} action={<Badge tone={current.botScore > 0.6 ? 'bad' : 'neutral'}>bot score {current.botScore.toFixed(2)}</Badge>}>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-mono text-xs text-mute">Campaign</dt>
              <dd className="mt-1">{current.campaign}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-mute">Views</dt>
              <dd className="mt-1">{current.views.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-mute">Clip</dt>
              <dd className="mt-1">
                <a href={current.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
                  Open <ExternalLink className="size-3" />
                </a>
              </dd>
            </div>
          </dl>
          {current.briefFlags.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {current.briefFlags.map((f) => (
                <Badge key={f} tone="warn">
                  {f}
                </Badge>
              ))}
            </ul>
          )}
          <div className="mt-6 grid gap-3">
            <Select aria-label="Reason" defaultValue="">
              <option value="" disabled>
                Reason (for rejections)
              </option>
              {['Breaks the brief', 'Off-limits material', 'Artificial views', 'Not original', 'Other'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
            <Textarea aria-label="Note to clipper" placeholder="Note to clipper (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <ActionButton onClick={() => decide('approve')}>
              <CheckCircle2 className="size-4" /> Approve
            </ActionButton>
            <ActionButton variant="danger" onClick={() => decide('reject')}>
              <XCircle className="size-4" /> Reject
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => decide('flag')}>
              <Flag className="size-4" /> Flag for fraud
            </ActionButton>
          </div>
        </Card>
      )}
    </div>
  )
}
