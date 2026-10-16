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
      {icon && (
        <span className="grid size-12 place-items-center rounded-full bg-white/[0.05]">
          <Icon name={icon} aria-hidden="true" className="size-5 text-mute" />
        </span>
      )}
      <p className="mt-5 text-lg font-medium tracking-tight">{title}</p>
      {body && <p className="mt-2 max-w-sm text-sm leading-relaxed text-mute">{body}</p>}
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
    <div data-table className="overflow-x-auto rounded-3xl border border-line bg-black/45">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-mute">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-6 py-3 font-normal', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        {rows.length > 0 && (
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.025]">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-6 py-4', c.className)}>
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
  neutral: 'bg-white/[0.07] text-mute',
  good: 'bg-emerald-400/10 text-emerald-300',
  warn: 'bg-amber-400/10 text-amber-300',
  bad: 'bg-signal/10 text-signal',
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs leading-none font-medium', TONES[tone])}>{children}</span>
}
