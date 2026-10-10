import { Icon, type IconName } from '@/components/icons'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: IconName
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <Icon name={icon} aria-hidden="true" className="size-6 text-mute" />}
      <p className="mt-4 font-display text-3xl">{title}</p>
      {body && <p className="mt-2 max-w-sm text-sm text-mute">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export type Column<T> = { key: string; header: string; render: (row: T) => React.ReactNode; className?: string }

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  empty: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto border border-line bg-surface/80 rounded-2xl">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line font-mono text-xs text-mute">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-5 py-3 font-normal', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        {rows.length > 0 && (
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper/[0.03]">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-5 py-4', c.className)}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
      {rows.length === 0 && empty}
    </div>
  )
}

const TONES = {
  neutral: 'border-line-strong text-mute',
  good: 'border-emerald-400/40 text-emerald-300',
  warn: 'border-amber-400/40 text-amber-300',
  bad: 'border-signal/50 text-signal',
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return <span className={cn('inline-flex items-center border px-2 py-0.5 font-mono text-[11px]', TONES[tone])}>{children}</span>
}

