'use client'

// A YouTube trailer in an iframe, driven by messages (no script from YouTube is loaded): the iframe is asked to play, pause, mute, seek and
// switch video, and it reports its state, time and errors back. This is the same channel YouTube's own player script uses.

export const HOST = 'https://www.youtube.com'

/** The address the one shared player starts with: it plays by itself, muted (the only kind of autoplay browsers allow), without controls. */
export const embedUrl = (key: string, origin: string) =>
  `${HOST}/embed/${key}?enablejsapi=1&autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0&origin=${encodeURIComponent(origin)}`

/** The address of the player a person starts themselves (with YouTube's own controls), for when the shared one could not start. */
export const theaterUrl = (key: string, origin: string) => `${HOST}/embed/${key}?autoplay=1&rel=0&playsinline=1&modestbranding=1&origin=${encodeURIComponent(origin)}`

export const watchUrl = (key: string) => `https://www.youtube.com/watch?v=${key}`

export function send(frame: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), HOST)
}

export type YtEvent =
  | { type: 'ready' }
  | { type: 'video'; id: string }
  | { type: 'state'; state: number } // -1 not started, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
  | { type: 'time'; time: number; duration: number }
  | { type: 'error'; code: number }

/**
 * Starts listening to a frame (call it when the frame has loaded). Says "ready" once the player answers, then reports what it does.
 * Returns what to call to stop.
 */
export function listen(frame: HTMLIFrameElement, on: (e: YtEvent) => void): () => void {
  let ready = false
  const hello = () => frame.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), HOST)
  const mark = () => {
    if (ready) return
    ready = true
    on({ type: 'ready' })
  }
  // the player's own scripts start a moment after its page has loaded, so ask again until it answers
  hello()
  const poll = setInterval(() => (ready ? clearInterval(poll) : hello()), 400)

  const read = (info: unknown) => {
    if (!info || typeof info !== 'object') return
    const i = info as { currentTime?: number; duration?: number; playerState?: number; videoData?: { video_id?: string } }
    if (typeof i.videoData?.video_id === 'string') on({ type: 'video', id: i.videoData.video_id })
    if (typeof i.playerState === 'number') on({ type: 'state', state: i.playerState })
    if (typeof i.currentTime === 'number') on({ type: 'time', time: i.currentTime, duration: typeof i.duration === 'number' ? i.duration : 0 })
  }

  const onMessage = (e: MessageEvent) => {
    if (e.source !== frame.contentWindow || e.origin !== HOST) return
    let d: { event?: string; info?: unknown } | null
    try {
      d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
    } catch {
      return
    }
    if (!d || typeof d !== 'object') return
    switch (d.event) {
      case 'initialDelivery':
        mark()
        read(d.info)
        break
      case 'onReady':
      case 'alreadyInitialized':
        mark()
        break
      case 'onError':
        on({ type: 'error', code: Number(d.info) })
        break
      case 'onStateChange':
        on({ type: 'state', state: Number(d.info) })
        break
      case 'infoDelivery':
        read(d.info)
        break
    }
  }
  window.addEventListener('message', onMessage)
  return () => {
    clearInterval(poll)
    window.removeEventListener('message', onMessage)
  }
}
