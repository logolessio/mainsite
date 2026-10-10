'use client'

import { useCallback, useEffect, useState } from 'react'
import { CAMPAIGN_STEPS, GuidedTour } from '@/components/browse/guided-tour'

/** Continues the tour from the campaigns page. Opens only when the URL carries ?tour=1. */
export function CampaignTour() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tour') !== '1') return
    const t = setTimeout(() => setOpen(true), 1400) // let the card finish floating in
    return () => clearTimeout(t)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  return <GuidedTour open={open} onClose={close} steps={CAMPAIGN_STEPS} />
}
