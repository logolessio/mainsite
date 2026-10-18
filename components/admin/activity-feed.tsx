import Link from 'next/link'
import { Card } from '@/components/app/ui'
import { type Activity } from '@/lib/activity'

const ago = (at: number) => {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - at)
  if (s < 90) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}

/** What happened on the site most recently, so the owner can see it moving without opening five pages. */
export function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <Card title="Recent activity">
      {items.length === 0 ? (
        <p className="text-sm text-mute">Nothing has happened yet. New members, submissions and withdrawals show up here.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((a, i) => (
            <li key={`${a.at}-${i}`}>
              <Link href={a.href} className="flex items-baseline justify-between gap-4 py-2.5 text-sm transition-colors hover:text-paper">
                <span className="min-w-0 truncate text-paper/85">{a.text}</span>
                <span className="shrink-0 text-xs text-mute tabular-nums">{ago(a.at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
