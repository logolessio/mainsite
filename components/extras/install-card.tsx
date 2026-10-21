'use client'

import { Download, Share } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFeature } from '@/components/shell/features-provider'

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

/**
 * "Add logoless to your home screen": the browser's own install prompt where there is one, and the two taps to do it by hand on an iPhone.
 * It shows nothing once the site is already installed, or where neither is possible.
 */
export function InstallCard() {
  const on = useFeature('install-app')
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [ios, setIos] = useState(false)
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    if (!on) return
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(standalone)
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone)
    const onPrompt = (e: Event) => (e.preventDefault(), setPrompt(e as Prompt))
    const onDone = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onDone)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onDone)
    }
  }, [on])
  if (!on || installed || (!prompt && !ios)) return null
  return (
    <div className="rounded-card border border-line-strong bg-white/[0.03] p-6">
      <h3 className="text-lg">Put logoless on your home screen</h3>
      <p className="mt-1 text-sm leading-relaxed text-mute">Opens like an app, full screen, one tap from your phone. Notifications and your dashboard are always close.</p>
      {prompt ? (
        <button type="button" onClick={() => void prompt.prompt().then(() => setPrompt(null))} className="mt-4 inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-6 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
          <Download aria-hidden="true" className="size-4" /> Install
        </button>
      ) : (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          Tap <Share aria-hidden="true" className="inline size-4" /> in Safari, then &ldquo;Add to Home Screen&rdquo;.
        </p>
      )}
    </div>
  )
}
