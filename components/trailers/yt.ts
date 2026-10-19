'use client'

// A YouTube trailer in an iframe, driven by messages (no script from YouTube is loaded): the iframe is asked to play, pause, mute and
// seek, and it reports its state, time and errors back. This is the same channel YouTube's own player script uses.

const ORIGIN = 'https://www.youtube-nocookie.com'

export type YtState = { ready: boolean; playing: boolean; ended: boolean; muted: boolean; time: number; duration: number; error: boolean }
export const INITIAL: YtState = { ready: false, playing: false, ended: false, muted: true, time: 0, duration: 0, error: false }

export const embedUrl = (key: string, origin: string) =>
  `${ORIGIN}/embed/${key}?enablejsapi=1&autoplay=0&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&mute=1&cc_load_policy=0&origin=${encodeURIComponent(origin)}`

export function send(frame: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), ORIGIN)
}

/** Starts listening to a frame. Returns what to call to stop. */
export function watch(frame: HTMLIFrameElement, on: (patch: Partial<YtState>) => void): () => void {
  let ready = false
  const hello = () => frame.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), ORIGIN)
  hello()
  const poll = setInterval(() => {
    if (ready) return clearInterval(poll)
    hello()
  }, 300)
  const onMessage = (e: MessageEvent) => {
    if (e.source !== frame.contentWindow || e.origin !== ORIGIN) return
    let d: { event?: string; info?: unknown }
    try {
      d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
    } catch {
      return
    }
    if (d.event === 'onReady') {
      ready = true
      on({ ready: true })
    } else if (d.event === 'onError') {
      on({ error: true })
    } else if (d.event === 'onStateChange') {
      const s = Number(d.info)
      on({ playing: s === 1, ended: s === 0 })
    } else if (d.event === 'infoDelivery' && d.info && typeof d.info === 'object') {
      const i = d.info as { currentTime?: number; duration?: number; playerState?: number; muted?: boolean }
      const p: Partial<YtState> = {}
      if (typeof i.currentTime === 'number') p.time = i.currentTime
      if (typeof i.duration === 'number' && i.duration > 0) p.duration = i.duration
      if (typeof i.muted === 'boolean') p.muted = i.muted
      if (typeof i.playerState === 'number') {
        p.playing = i.playerState === 1
        p.ended = i.playerState === 0
        ready = true
        p.ready = true
      }
      on(p)
    }
  }
  window.addEventListener('message', onMessage)
  return () => {
    clearInterval(poll)
    window.removeEventListener('message', onMessage)
  }
}
