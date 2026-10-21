'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Switch } from '@/components/shell/notify/notify-settings'
import { Card } from './ui'

type Page = { id: 'discord'; label: string; shown: boolean }
const HINT: Record<Page['id'], string> = { discord: 'Link Discord, see your roles and choose your Discord messages.' }

/** Pages someone can take out of their dashboard sidebar, and put back. Hidden when there are none. */
export function SidebarCard() {
  const router = useRouter()
  const [pages, setPages] = useState<Page[] | null>(null)
  useEffect(() => {
    fetch('/api/me/sidebar', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { pages: Page[] } | null) => setPages(j?.pages ?? []))
      .catch(() => setPages([]))
  }, [])
  if (!pages?.length) return null
  const flip = async (p: Page, shown: boolean) => {
    setPages((cur) => cur?.map((x) => (x.id === p.id ? { ...x, shown } : x)) ?? cur)
    const res = await fetch('/api/me/sidebar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ page: p.id, shown }) }).catch(() => null)
    if (!res?.ok) setPages((cur) => cur?.map((x) => (x.id === p.id ? { ...x, shown: !shown } : x)) ?? cur)
    else router.refresh() // the sidebar is drawn by the server: draw it again
  }
  return (
    <Card id="sidebar" title="Sidebar" sub="Pages you can show or hide in your dashboard menu.">
      <ul className="divide-y divide-line">
        {pages.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <span className="min-w-0">
              <span className="block text-[15px]">{p.label}</span>
              <span className="block text-sm text-mute">{HINT[p.id]}</span>
            </span>
            <Switch checked={p.shown} onChange={(v) => flip(p, v)} label={`Show ${p.label} in the sidebar`} />
          </li>
        ))}
      </ul>
    </Card>
  )
}
