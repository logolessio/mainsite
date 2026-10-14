'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

export type Day = { d: string; views: number; spent: number }
const RANGES = [
  { id: '7', label: '7D', days: 7 },
  { id: '30', label: '30D', days: 30 },
  { id: '90', label: '90D', days: 90 },
  { id: 'all', label: 'All time', days: 0 },
] as const

const key = (t: Date) => t.toISOString().slice(0, 10)

/** Verified views per day as a line, with the range switch the dashboard uses. Hover for the exact day. */
export function ViewsChart({ series, today }: { series: Day[]; today: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('30')
  const [hover, setHover] = useState<number | null>(null)

  const data = useMemo(() => {
    const by = new Map(series.map((s) => [s.d, s]))
    const days = RANGES.find((r) => r.id === range)?.days ?? 0
    const end = new Date(`${today}T00:00:00Z`)
    const first = series[0] ? new Date(`${series[0].d}T00:00:00Z`) : end
    const start = days ? new Date(end.getTime() - (days - 1) * 86400000) : first
    const out: Day[] = []
    for (let t = new Date(Math.min(start.getTime(), end.getTime())); t <= end; t = new Date(t.getTime() + 86400000)) {
      const k = key(t)
      out.push(by.get(k) ?? { d: k, views: 0, spent: 0 })
    }
    return out
  }, [series, range, today])

  const W = 640
  const H = 190
  const max = Math.max(1, ...data.map((p) => p.views))
  const x = (i: number) => (data.length <= 1 ? W / 2 : (i / (data.length - 1)) * W)
  const y = (v: number) => H - 8 - (v / max) * (H - 24)
  const line = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.views).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`
  const total = data.reduce((a, p) => a + p.views, 0)
  const spent = data.reduce((a, p) => a + p.spent, 0)
  const shown = hover !== null ? data[hover] : null

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-5xl leading-none tracking-[-0.04em] tabular-nums md:text-6xl">{Math.round(shown ? shown.views : total).toLocaleString()}</p>
          <p className="mt-2 text-[15px] text-paper/50">
            {shown ? `verified views on ${shown.d}` : 'verified views'} · ${((shown ? shown.spent : spent) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })} spent
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-line p-1" role="tablist" aria-label="Range">
          {RANGES.map((r) => (
            <button key={r.id} type="button" role="tab" aria-selected={range === r.id} onClick={() => setRange(r.id)} className={cn('h-8 rounded-full px-3.5 text-[13px] transition-colors', range === r.id ? 'bg-paper text-ink' : 'text-mute hover:text-paper')}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-6 h-48 w-full touch-none"
        preserveAspectRatio="none"
        role="img"
        aria-label="Verified views per day"
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const f = (e.clientX - r.left) / r.width
          setHover(Math.max(0, Math.min(data.length - 1, Math.round(f * (data.length - 1)))))
        }}
      >
        <defs>
          <linearGradient id="vc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".16" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#fff" strokeOpacity=".06" />
        ))}
        <path d={area} fill="url(#vc-fill)" />
        <path d={line} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="#fff" strokeOpacity=".25" vectorEffect="non-scaling-stroke" />
            <circle cx={x(hover)} cy={y(data[hover].views)} r="4" fill="#fff" />
          </g>
        )}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-mute">
        <span>{data[0]?.d}</span>
        <span>{data[data.length - 1]?.d}</span>
      </div>
    </div>
  )
}
