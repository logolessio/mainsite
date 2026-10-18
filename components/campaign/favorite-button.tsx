'use client'

import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTransitions } from '@/components/shell/transition-provider'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

/** Heart a campaign to be told when it is paused, nearly out of budget, or ends. */
export function FavoriteButton({ id, className }: { id: string; className?: string }) {
  const { navigate } = useTransitions()
  const [on, setOn] = useState(false)
  const [known, setKnown] = useState(false) // false until we know whether the visitor is signed in
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    let live = true
    fetch('/api/me/favorites', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ids: string[] } | null) => {
        if (!live) return
        setSignedIn(Boolean(j))
        setOn(Boolean(j?.ids.includes(id)))
        setKnown(true)
      })
      .catch(() => live && setKnown(true))
    return () => {
      live = false
    }
  }, [id])

  const toggle = async () => {
    if (!signedIn) return navigate('/login')
    const next = !on
    setOn(next)
    const res = await fetch('/api/me/favorites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campaignId: id, on: next }) }).catch(() => null)
    if (!res?.ok) {
      setOn(!next)
      toast.error('Could not save that. Try again.')
    } else toast.ok(next ? 'Favourited. We will tell you when it changes.' : 'Removed from favourites')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      data-key="f"
      data-key-label="Favourite it"
      aria-keyshortcuts="f"
      aria-label={on ? 'Remove from favourites' : 'Add to favourites'}
      title={signedIn || !known ? (on ? 'Favourited: we will tell you when it changes' : 'Favourite to get updates') : 'Log in to favourite'}
      className={cn('grid size-9 place-items-center rounded-pill border border-line-strong transition-colors hover:bg-paper/10', className)}
    >
      <motion.span key={String(on)} initial={on ? { scale: 0.6 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }} className="grid place-items-center">
        <Heart className={cn('size-4 transition-colors', on && 'fill-paper text-paper')} />
      </motion.span>
    </button>
  )
}
