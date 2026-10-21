// A light browser fingerprint for the one-spot-per-device check. It is a hash of things the browser already tells every site (screen,
// time zone, language, how it draws a line of text). The raw values never leave the browser, and the server hashes the hash again,
// with the network, before storing it. It only matters when someone clears their cookies to join a second time.

let cached: Promise<string | undefined> | null = null

async function compute(): Promise<string | undefined> {
  try {
    const n = navigator as Navigator & { deviceMemory?: number }
    let ink = ''
    try {
      const c = document.createElement('canvas')
      c.width = 220
      c.height = 30
      const g = c.getContext('2d')
      if (g) {
        g.textBaseline = 'top'
        g.font = "16px 'Arial'"
        g.fillStyle = '#f60'
        g.fillRect(100, 1, 62, 20)
        g.fillStyle = '#069'
        g.fillText('logoless, views have value', 2, 15)
        g.fillStyle = 'rgba(102, 204, 0, 0.7)'
        g.fillText('logoless, views have value', 4, 17)
        ink = c.toDataURL()
      }
    } catch {
      /* some browsers block canvas reads; the rest is enough */
    }
    const parts = [
      n.userAgent,
      n.language,
      (n.languages ?? []).join(','),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      String(window.devicePixelRatio),
      String(n.hardwareConcurrency ?? ''),
      String(n.deviceMemory ?? ''),
      String(n.maxTouchPoints ?? ''),
      ink,
    ].join('|')
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts))
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return undefined
  }
}

export const fingerprint = () => (cached ??= compute())
