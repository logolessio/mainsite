'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BrandIcon } from '@/components/brand-icon'
import { useDialog } from '@/hooks/use-dialog'
import { useMounted } from '@/hooks/use-motion-prefs'
import type { SocialPlatform } from '@/lib/accounts'
import { SPRING_POP } from '@/lib/layout'
import { buildLink, USERNAME_LINKS } from '@/lib/profile-style'

const LABEL: Record<SocialPlatform, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube' }

/** Type the username you post from. It goes on your profile and our team matches your clips to it. */
export function AddAccountDialog({ platform, open, onClose, onAdded }: { platform: SocialPlatform | null; open: boolean; onClose: () => void; onAdded: (platform: SocialPlatform, handle: string, url: string) => void }) {
  const mounted = useMounted()
  if (!mounted) return null
  return createPortal(<AnimatePresence>{open && platform && <Dialog key={platform} platform={platform} onClose={onClose} onAdded={onAdded} />}</AnimatePresence>, document.body)
}

function Dialog({ platform, onClose, onAdded }: { platform: SocialPlatform; onClose: () => void; onAdded: (p: SocialPlatform, handle: string, url: string) => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const spec = USERNAME_LINKS[platform]
  const box = useDialog<HTMLFormElement>(true, onClose, { initial: 'none' })
  useEffect(() => {
    input.current?.focus()
  }, [])
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const built = buildLink(platform, value)
    if ('error' in built) return setError(built.error)
    onAdded(platform, value.trim().replace(/^@+/, ''), built.url)
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4" onClick={onClose}>
      <motion.form ref={box} onSubmit={submit} role="dialog" aria-modal="true" aria-label={`Add ${LABEL[platform]}`} initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.16 } }} transition={SPRING_POP} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[28px] border border-white/12 bg-gradient-to-b from-[#17171b] to-[#0b0b0d] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full border border-line"><BrandIcon name={platform} className="size-6" /></span>
            <div>
              <h2 className="font-display text-2xl">Add {LABEL[platform]}</h2>
              <p className="text-sm text-mute">Your username is enough.</p>
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-white/10"><X className="size-4" /></button>
        </div>
        <label className="mt-6 block">
          <span className="font-mono text-xs text-mute">Username</span>
          <span className="mt-2 flex h-12 items-center rounded-2xl border border-line-strong bg-ink/70 px-4 focus-within:border-paper/60">
            {spec && <span className="mr-0.5 shrink-0 text-sm text-mute">{spec.label}</span>}
            <input ref={input} value={value} onChange={(e) => { setValue(e.target.value); setError('') }} placeholder="yourname" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-mute" />
          </span>
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-signal">{error}</p>}
        <p className="mt-4 text-xs leading-relaxed text-mute">This is shown on your profile, and our team checks your submitted clips against the accounts you list. Only submit clips you posted yourself.</p>
        <button type="submit" disabled={!value.trim()} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-paper text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">Add to my profile</button>
      </motion.form>
    </motion.div>
  )
}
