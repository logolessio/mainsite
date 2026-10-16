'use client'

import { Fragment } from 'react'
import type { Embed, Message } from '@/lib/discord/api'
import { tidy } from '@/lib/discord/ui'

/**
 * Draws a bot message the way Discord does (dark theme), so the team can see every message without sending it. It follows the
 * parts of Discord's markup the bot uses: bold, code pills, headings, small print, links, channel and user mentions and times.
 */
// the bot's pictures live on logoless.io; here they load from this site, so they show before they are deployed
const local = (url: string) => url.replace(/^https:\/\/logoless\.io/, '')

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|<#\d+>|<@&?\d+>|<t:\d+:R>)/g

function inline(text: string, key: string) {
  return text.split(TOKEN).map((part, n) => {
    if (!part) return null
    const k = `${key}-${n}`
    if (part.startsWith('**')) return <strong key={k} className="font-semibold text-[#f2f3f5]">{inline(part.slice(2, -2), k)}</strong>
    if (part.startsWith('`')) return <code key={k} className="rounded bg-[#1e1f22] px-1 py-px font-mono text-[0.85em]">{part.slice(1, -1)}</code>
    if (part.startsWith('[')) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
      return m ? <span key={k} className="text-[#00a8fc]">{m[1]}</span> : part
    }
    if (part.startsWith('<#')) return <span key={k} className="rounded bg-[#3c4270] px-1 text-[#c9cdfb]">#channel</span>
    if (part.startsWith('<@')) return <span key={k} className="rounded bg-[#3c4270] px-1 text-[#c9cdfb]">@member</span>
    if (part.startsWith('<t:')) return <span key={k}>just now</span>
    return <Fragment key={k}>{part}</Fragment>
  })
}

function Body({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split('\n').map((line, n) => {
        if (line.startsWith('## ')) return <p key={n} className="mt-1 mb-0.5 text-[1.5rem] leading-tight font-bold text-[#f2f3f5]">{inline(line.slice(3), `l${n}`)}</p>
        if (line.startsWith('# ')) return <p key={n} className="mt-1 mb-0.5 text-[1.75rem] leading-tight font-bold text-[#f2f3f5]">{inline(line.slice(2), `l${n}`)}</p>
        if (line.startsWith('-# ')) return <p key={n} className="text-[0.75rem] leading-snug text-[#949ba4]">{inline(line.slice(3), `l${n}`)}</p>
        return <p key={n} className="min-h-[1.1em] whitespace-pre-wrap">{inline(line, `l${n}`)}</p>
      })}
    </div>
  )
}

function EmbedView({ e }: { e: Embed }) {
  const bar = `#${(e.color ?? 0xf3f2ee).toString(16).padStart(6, '0')}`
  return (
    <div className="grid max-w-[520px] gap-2 rounded-[4px] border-l-4 bg-[#2b2d31] p-3 pr-4 text-[0.875rem] leading-[1.35] text-[#dbdee1]" style={{ borderLeftColor: bar }}>
      <div className="flex gap-3">
        <div className="min-w-0 flex-1 grid gap-1.5">
          {e.author && (
            <p className="flex items-center gap-2 text-[0.8rem] font-semibold text-[#f2f3f5]">
              {e.author.icon_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={local(e.author.icon_url)} alt="" className="size-6 rounded-full" />
              )}
              {e.author.name}
            </p>
          )}
          {e.title && <p className={`font-semibold ${e.url ? 'text-[#00a8fc]' : 'text-[#f2f3f5]'} text-[1rem]`}>{e.title}</p>}
          {e.description && <Body text={e.description} />}
          {e.fields && e.fields.length > 0 && (
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              {e.fields.map((f, n) => (
                <div key={n} className={f.inline ? 'col-span-1 min-w-0' : 'col-span-3'}>
                  <p className="text-[0.8rem] font-semibold text-[#f2f3f5]">{inline(f.name, `fn${n}`)}</p>
                  <Body text={f.value} />
                </div>
              ))}
            </div>
          )}
        </div>
        {e.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={local(e.thumbnail.url)} alt="" className="size-16 shrink-0 rounded object-cover" />
        )}
      </div>
      {e.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={local(e.image.url)} alt="" className="max-h-72 w-full rounded object-cover" />
      )}
      {(e.footer || e.timestamp) && (
        <p className="text-[0.72rem] text-[#949ba4]">{[e.footer?.text, e.timestamp ? 'Today' : ''].filter(Boolean).join(' · ')}</p>
      )}
    </div>
  )
}

export function MessagePreview({ message }: { message: Message }) {
  const m = tidy(message)
  return (
    <div className="grid gap-2 rounded-xl bg-[#313338] p-4 font-sans text-[#dbdee1]">
      {m.content && <Body text={m.content} className="text-[0.95rem]" />}
      {m.embeds?.map((e, n) => (
        <EmbedView key={n} e={e} />
      ))}
      {m.components?.map((r, n) => (
        <div key={n} className="flex flex-wrap gap-2">
          {r.components.map((c, k) => (
            <span key={k} className="inline-flex h-8 items-center rounded-[3px] bg-[#4e5058] px-4 text-[0.875rem] font-medium text-white">
              {c.label}
              {c.url && <span aria-hidden="true" className="ml-1.5 text-[0.7rem]">↗</span>}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
