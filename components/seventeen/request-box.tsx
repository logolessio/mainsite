'use client'

import { ArrowUpRight, Check, Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { SEVENTEEN_LINKS } from '@/components/seventeen/links'
import { Poster } from '@/components/seventeen/poster'
import { packName, type Pack } from '@/lib/seventeen/packs'

/**
 * The request search. What is typed is matched against the catalogue first, so nobody asks for a pack that is already up. When nothing
 * matches, "Request on Discord" copies a ready request line and opens the Discord, where the team takes requests (17 keeps no accounts).
 * Under it, the packs that went up most recently.
 */
export function RequestBox({ packs, initial }: { packs: Pack[]; initial: string }) {
  const [q, setQ] = useState(initial)
  const [copied, setCopied] = useState(false)
  const want = q.trim()
  const hits = useMemo(() => {
    const w = want.toLowerCase()
    return w.length < 2 ? [] : packs.filter((p) => p.title.toLowerCase().includes(w)).slice(0, 4)
  }, [packs, want])

  const request = async () => {
    try {
      await navigator.clipboard.writeText(`Scenepack request: ${want}`)
      setCopied(true)
    } catch {}
    window.open(SEVENTEEN_LINKS.discord, '_blank', 'noopener')
  }

  return (
    <>
      <form
        className="mx-auto mt-9 max-w-[520px]"
        onSubmit={(e) => {
          e.preventDefault()
          if (want && hits.length === 0) request()
        }}
      >
        <div className="relative flex items-center rounded-[50px] border border-[#27272a] bg-[#0a0a0a] p-1.5 pl-12 focus-within:border-[#ff1f38]/60">
          <Search className="pointer-events-none absolute left-[18px] size-4 text-white/40" />
          <label htmlFor="s17-request" className="sr-only">Film, series or player</label>
          <input
            id="s17-request"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setCopied(false)
            }}
            maxLength={80}
            placeholder="Search films, series, players..."
            autoComplete="off"
            className="h-[34px] min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"
          />
          <button type="submit" disabled={!want || hits.length > 0} className="inline-flex h-[34px] shrink-0 items-center gap-1 rounded-full bg-white px-4 text-[12px] font-semibold text-black transition-opacity disabled:opacity-30">
            Request
          </button>
        </div>
        <div className="mt-4 min-h-6 text-center text-[12px] text-white/50" aria-live="polite">
          {hits.length > 0 ? (
            <p>
              Already up:{' '}
              {hits.map((p, i) => (
                <span key={p.slug}>
                  {i > 0 && ', '}
                  <Link href={`/p/${p.slug}`} className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                    {packName(p)}
                  </Link>
                </span>
              ))}
            </p>
          ) : copied ? (
            <p className="inline-flex items-center gap-1.5 text-[#2ed0b0]">
              <Check className="size-3.5" />
              Request copied. Paste it in the requests channel.
            </p>
          ) : (
            <p>
              Requests are taken on our{' '}
              <a href={SEVENTEEN_LINKS.discord} className="inline-flex items-center text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                Discord
                <ArrowUpRight className="size-3" />
              </a>{' '}
              and most go up within the week.
            </p>
          )}
        </div>
      </form>

      <div className="mt-20">
        <p className="text-[18px] font-semibold text-white">Just added</p>
        <p className="mt-1 text-[12px] text-white/45">The newest packs from the team</p>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6 lg:gap-[18px]">
          {packs.slice(0, 6).map((p) => (
            <li key={p.slug}>
              <Link href={`/p/${p.slug}`} className="group relative block aspect-[2/3] overflow-hidden rounded-xl border border-white/15 bg-[#09090b] transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-white/35">
                <Poster pack={p} className="transition-transform duration-500 group-hover:scale-[1.04]" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
