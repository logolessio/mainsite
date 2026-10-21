'use client'

import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

/** Pick up to three campaigns; the page below shows them side by side. */
export function ComparePicker({ options, picked }: { options: { id: string; title: string; creator: string }[]; picked: string[] }) {
  const router = useRouter()
  const toggle = (id: string) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id].slice(-3)
    router.replace(next.length ? `/compare?c=${next.join(',')}` : '/compare', { scroll: false })
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = picked.includes(o.id)
        return (
          <button key={o.id} type="button" onClick={() => toggle(o.id)} aria-pressed={on} className={cn('inline-flex h-10 items-center gap-2 rounded-pill border px-4 text-sm transition-colors', on ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
            {on && <Check aria-hidden="true" className="size-3.5" />}
            {o.title}
            <span className={cn('hidden sm:inline', on ? 'text-ink/60' : 'text-mute/70')}>{o.creator}</span>
          </button>
        )
      })}
    </div>
  )
}
