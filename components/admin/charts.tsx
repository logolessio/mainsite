type Point = { d: string; [k: string]: string | number | null }

/** A small bar chart drawn as plain SVG, one bar per day. No chart library, so it stays light. */
export function Bars({ data, field, label, color = '#f3f2ee' }: { data: Point[]; field: string; label: string; color?: string }) {
  const values = data.map((p) => Number(p[field] ?? 0))
  const max = Math.max(1, ...values)
  const total = values.reduce((a, b) => a + b, 0)
  const w = 560
  const h = 120
  const gap = 3
  const bw = data.length ? Math.min(34, Math.max(2, (w - gap * (data.length - 1)) / data.length)) : 0
  const offset = data.length ? (w - (bw * data.length + gap * (data.length - 1))) / 2 : 0
  return (
    <figure className="rounded-[calc(22px*var(--round,1))] border border-line bg-surface/70 p-4">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs text-mute">{label}</span>
        <span className="font-display text-2xl leading-none">{total.toLocaleString()}</span>
      </figcaption>
      {data.length === 0 ? (
        <p className="mt-6 text-xs text-mute">No data yet.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-28 w-full" role="img" aria-label={`${label} per day`} preserveAspectRatio="none">
            {values.map((v, i) => {
              const bh = Math.max(v ? 2 : 0, (v / max) * (h - 4))
              return (
                <rect key={data[i].d} x={offset + i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={Math.min(3, bw / 2)} fill={color} opacity={0.85}>
                  <title>{`${data[i].d}: ${v.toLocaleString()}`}</title>
                </rect>
              )
            })}
          </svg>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-mute">
            <span>{data[0].d}</span>
            <span>peak {max.toLocaleString()}</span>
            <span>{data[data.length - 1].d}</span>
          </div>
        </>
      )}
    </figure>
  )
}

/** A ranked list with a proportional bar behind each row. */
export function Ranked({ title, rows, unit = '', extra }: { title: string; rows: { label: string | number | null; n: number | string | null; [k: string]: unknown }[]; unit?: string; extra?: (r: Record<string, unknown>) => string }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.n ?? 0)))
  return (
    <section className="rounded-[calc(22px*var(--round,1))] border border-line bg-surface/70 p-4">
      <h2 className="font-mono text-xs text-mute">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-xs text-mute">Nothing yet.</p>
      ) : (
        <ul className="mt-3 grid gap-1.5">
          {rows.map((r, i) => (
            <li key={i} className="relative overflow-hidden rounded-lg px-2.5 py-1.5 text-sm">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-paper/[0.08]" style={{ width: `${(Number(r.n ?? 0) / max) * 100}%` }} />
              <span className="relative flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{String(r.label ?? '-')}</span>
                <span className="shrink-0 font-mono text-xs text-mute">
                  {extra ? `${extra(r)} · ` : ''}
                  {Number(r.n ?? 0).toLocaleString()}
                  {unit}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
