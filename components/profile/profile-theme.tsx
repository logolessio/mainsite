'use client'

import { useEffect } from 'react'
import { DOT_EVENT } from '@/components/shell/ridge-field'

/** Recolours the page's dot background while a profile is on screen, and puts it back afterwards. */
export function ProfileTheme({ dot }: { dot: string }) {
  useEffect(() => {
    document.documentElement.dataset.dotColor = dot
    window.dispatchEvent(new CustomEvent(DOT_EVENT, { detail: dot }))
    return () => {
      delete document.documentElement.dataset.dotColor
      window.dispatchEvent(new CustomEvent(DOT_EVENT, { detail: '#ffffff' }))
    }
  }, [dot])
  return null
}
