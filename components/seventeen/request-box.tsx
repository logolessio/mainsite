'use client'

import { ArrowRight, Check, Search, Star } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { SEVENTEEN_DISCORD } from '@/components/seventeen/links'
import { firstYear, poster, type Pack } from '@/lib/seventeen/packs'

/**
 * The request search. What is typed is matched against the catalogue first (title, director and cast), so nobody asks for a pack that is
 * already up. When nothing matches, the button copies a ready request line and opens the Discord, where the team takes requests.
 */
export function RequestBox({ packs, initial }: { packs: Pack[]; initial: string }) {
  const [q, setQ] = useState(initial)
  const [copied, setCopied] = useState(false)
  const want = q.trim()
  const hits = useMemo(() => {
    const w = want.toLowerCase()
    return w.length < 2 ? [] : packs.filter((p) => [p.title, p.director, ...p.actors].join(' ').toLowerCase().includes(w)).slice(0, 4)
  }, [packs, want])

  const request = async () => {
    try {
      await navigator.clipboard.writeText(`Scenepack request: ${want}`)
      setCopied(true)
    } catch {}
    window.open(SEVENTEEN_DISCORD, '_blank', 'noopener')
  }

  return (
    <div className="mx-auto mt-12 max-w-[680px]">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (want) request()
        }}
        className="flex items-center gap-2 rounded-full bg-white/[0.06] p-2 pl-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_30px_80px_-30px_rgb(255_31_56/0.35)] ring-1 ring-white/15 backdrop-blur-xl focus-within:ring-[#ff1f38]/70"
      >
        <Search className="size-[18px] shrink-0 text-white/50" />
        <label htmlFor="s17-request" className="sr-only">Film, series, anime or character</label>
        <input
          id="s17-request"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setCopied(false)
          }}
          maxLength={80}
          placeholder="Film, series, anime or character…"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/35"
        />
        <button type="submit" disabled={!want} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-black transition-opacity disabled:opacity-30 sm:px-6">
          <BrandIcon name="discord" className="size-[18px]" />
          <span className="hidden sm:inline">Request</span>
        </button>
      </form>

      <div className="mt-5 min-h-7 text-center text-[13.5px] text-white/55" aria-live="polite">
        {copied ? (
          <p className="inline-flex items-center gap-2 text-[#2ed0b0]">
            <Check className="size-4" />
            Copied. Paste it in #requests on the Discord.
          </p>
        ) : hits.length > 0 ? (
          <p>Already on 17, no need to ask:</p>
        ) : (
          <p>Type what you want, press Request, and paste it in #requests.</p>
        )}
      </div>

      {hits.length > 0 && !copied && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {hits.map((p) => (
            <li key={p.slug}>
              <Link href={`/p/${p.slug}`} className="group flex items-center gap-3.5 rounded-2xl bg-white/[0.04] p-2.5 pr-4 ring-1 ring-white/10 transition-colors hover:bg-white/[0.08]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster(p, 92)} alt="" className="h-[66px] w-11 rounded-lg object-cover ring-1 ring-white/10" />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[14.5px] font-semibold text-white">{p.title}</span>
                  <span className="s17-mono mt-1 flex items-center gap-1.5 text-[10.5px] uppercase text-white/40">
                    <Star className="size-3 fill-[#ffc857] text-[#ffc857]" /> {p.imdbRating} · {firstYear(p)} · {p.files.length} files
                  </span>
                </span>
                <ArrowRight className="size-4 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
