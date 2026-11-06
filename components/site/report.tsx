'use client'

import { useState } from 'react'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

const REASONS = ['impersonating someone', 'scam, phishing or malware', 'hateful or harassing', 'sexual content', 'violence or self-harm', 'my copyright (music, video, pictures)', 'spam or a squatted name', 'something else'] as const

/** Builds the report as an email to the abuse address, opened in the visitor's own mail app: nothing is sent until they send it. */
export function ReportForm() {
  const [page, setPage] = useState('')
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const handle = page.trim().replace(/^https?:\/\/(www\.)?logoless\.io\//i, '').replace(/^@/, '').split(/[/?#]/)[0]
  const ready = Boolean(handle && reason)
  const subject = `Report: logoless.io/${handle} (${reason})`
  const body = `Page: https://logoless.io/${handle}\nReason: ${reason}\n\nWhat's wrong:\n${details}\n`
  const href = `mailto:${SITE.emails.abuse}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  const field = 'w-full border border-white/20 bg-black px-4 text-[0.9rem] text-white outline-none transition-colors placeholder:text-white/25 focus:border-white'
  return (
    <form className="mt-12 grid gap-8" onSubmit={(e) => (e.preventDefault(), ready && (window.location.href = href))}>
      <label className="grid gap-2">
        <span className="cap text-white/50">the page</span>
        <span className="flex items-center border border-white/20 focus-within:border-white">
          <span className="pl-4 text-[0.9rem] text-white/40">logoless.io/</span>
          <input value={page} onChange={(e) => setPage(e.target.value)} placeholder="name" required spellCheck={false} autoCapitalize="off" className="h-12 min-w-0 flex-1 bg-transparent pr-4 text-[0.9rem] outline-none placeholder:text-white/25" />
        </span>
      </label>
      <fieldset className="grid gap-2">
        <legend className="cap mb-2 text-white/50">what&apos;s wrong</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {REASONS.map((r) => (
            <label key={r} className={cn('flex cursor-pointer items-center gap-3 border px-4 py-3 text-[0.84rem] transition-colors', reason === r ? 'border-white bg-white text-black' : 'border-white/15 text-white/70 hover:border-white/40')}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="sr-only" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2">
        <span className="cap text-white/50">details (optional)</span>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} maxLength={2000} placeholder="which link, what it does, anything that helps us check it quickly" className={cn(field, 'resize-y py-3 leading-relaxed')} />
      </label>
      {reason.startsWith('my copyright') && (
        <p className="border border-white/20 p-4 text-[0.8rem] leading-relaxed text-white/60">
          copyright claims need a few legal details. see <a href="/legal/dmca" className="text-white underline underline-offset-4">copyright &amp; DMCA</a> for what to include, and send it to {SITE.emails.legal}.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={!ready} className="btn btn-solid disabled:pointer-events-none disabled:opacity-30">
          write the email
        </button>
        <p className="text-[0.76rem] text-white/45">opens your mail app with the report filled in. nothing is sent until you press send there.</p>
      </div>
    </form>
  )
}
