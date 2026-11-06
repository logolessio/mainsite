'use client'

import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MAX_PAGES, pageSlug } from '@/lib/bio'
import { cn } from '@/lib/utils'
import type { EditorApi } from './types'
import { Btn, Input } from './ui'

/**
 * The pages of the site: Home, and any others (About, Work, Contact...). Pressing one edits that page; the things below it are that page's. Each other
 * page has its own address (logoless.io/you/about) and a menu at the top of the site links them all together.
 */
export function PagesBar({ api, compact = false }: { api: EditorApi; /** only the row that picks which page is being edited (for the Links page) */ compact?: boolean }) {
  const { page, setPage, pages, profile } = api
  const list = api.cfg.pages ?? []
  const cur = list.find((p) => p.id === page)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState(cur?.slug ?? '')
  const [sure, setSure] = useState(false)
  useEffect(() => {
    setSlug(cur?.slug ?? '')
    setSure(false)
  }, [cur?.id, cur?.slug])

  const create = () => {
    const title = name.trim()
    if (!title) return
    setPage(pages.add(title))
    setName('')
    setAdding(false)
  }
  const tab = 'inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-[0.78rem] transition-[background,color,border-color] duration-200'
  if (compact && list.length === 0) return null
  return (
    <div>
      <div role="tablist" aria-label="Pages of your site" className="flex flex-wrap gap-1.5">
        {[{ id: '', title: 'Home' }, ...list].map((p) => (
          <button key={p.id || 'home'} type="button" role="tab" aria-selected={page === p.id} onClick={() => setPage(p.id)} className={cn(tab, page === p.id ? 'border-transparent bg-[#ececec] text-[#0a0a0a]' : 'border-[var(--ed-line2)] text-white/70 hover:border-white/30 hover:text-white')}>
            {p.title}
          </button>
        ))}
        {!compact && list.length < MAX_PAGES && !adding && (
          <button type="button" onClick={() => setAdding(true)} className={cn(tab, 'gap-1.5 border-dashed border-[var(--ed-line2)] text-white/55 hover:border-white/40 hover:text-white')}>
            <Plus className="size-3.5" /> Add a page
          </button>
        )}
      </div>
      {!compact && adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
          className="mt-3 flex gap-2"
        >
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="About, Work, Contact, Shop" aria-label="Name of the new page" />
          <Btn variant="solid" type="submit" disabled={!name.trim()}>
            Add
          </Btn>
          <Btn variant="quiet" onClick={() => (setAdding(false), setName(''))}>
            Cancel
          </Btn>
        </form>
      )}
      {!compact && list.length === 0 && !adding && <p className="mt-3 text-[0.74rem] leading-snug text-[var(--ed-mute)]">Add pages like About or Work and your site gets a menu along the top. Each page has its own address.</p>}
      {compact && cur && <p className="mt-3 text-[0.76rem] text-[var(--ed-mute)]">You are adding to “{cur.title}”. Your look, picture and name are shared with the other pages.</p>}
      {!compact && cur && (
        <div className="mt-4 space-y-3 rounded-xl border border-[var(--ed-line)] p-3.5">
          <p className="text-[0.74rem] text-[var(--ed-mute)]">You are editing this page. Your look, picture and name are shared with the other pages.</p>
          <Input value={cur.title} maxLength={30} aria-label="Page title" onChange={(e) => pages.patch(cur.id, { title: e.target.value })} />
          <div className="flex h-10 items-center overflow-hidden rounded-xl border border-[var(--ed-line)] bg-white/[0.03] focus-within:border-white/40">
            <span className="shrink-0 pl-3.5 text-[0.78rem] text-white/40">
              logoless.io/{profile.handle}/
            </span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))}
              onBlur={() => {
                const v = pageSlug(slug)
                if (v && v !== cur.slug && !list.some((p) => p.id !== cur.id && p.slug === v)) pages.patch(cur.id, { slug: v })
                else setSlug(cur.slug)
              }}
              spellCheck={false}
              autoCapitalize="off"
              aria-label="Page address"
              className="h-full min-w-0 flex-1 bg-transparent px-1 text-[0.86rem] outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={() => pages.move(cur.id, -1)} aria-label="Move left" disabled={list[0]?.id === cur.id}>
              <ArrowLeft className="size-3.5" />
            </Btn>
            <Btn onClick={() => pages.move(cur.id, 1)} aria-label="Move right" disabled={list[list.length - 1]?.id === cur.id}>
              <ArrowRight className="size-3.5" />
            </Btn>
            <span className="flex-1" />
            {sure ? (
              <>
                <Btn variant="solid" onClick={() => pages.remove(cur.id)}>
                  Yes, delete it
                </Btn>
                <Btn variant="quiet" onClick={() => setSure(false)}>
                  Keep it
                </Btn>
              </>
            ) : (
              <Btn variant="quiet" onClick={() => setSure(true)}>
                <Trash2 className="size-3.5" /> Delete page
              </Btn>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
