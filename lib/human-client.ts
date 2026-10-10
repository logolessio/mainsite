// Browser side of the human check. Shows a small card while Cloudflare Turnstile runs, then resolves.
// If Turnstile is not configured it resolves immediately, so sign-in still works while you are setting things up.

type Turnstile = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

let loading: Promise<void> | null = null
function loadScript() {
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      loading = null
      reject(new Error('Could not load the human check. Check your connection and try again.'))
    }
    document.head.appendChild(s)
  })
  return loading
}

export async function ensureHuman(): Promise<void> {
  const cfg = (await fetch('/api/security/config', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({}))) as { turnstileSiteKey?: string | null }
  if (!cfg.turnstileSiteKey) return
  await loadScript()

  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[100] grid place-items-center bg-black/70 px-5'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-label', 'Checking that you are human')
  overlay.innerHTML =
    '<div class="w-full max-w-sm rounded-[28px] border border-white/15 bg-[#09090a] p-6 text-center"><p class="font-display text-2xl">One quick check</p><p class="mt-2 text-sm text-white/55">Making sure you are a person, not a bot.</p><div data-slot class="mt-5 grid min-h-[70px] place-items-center"></div></div>'
  document.body.appendChild(overlay)
  const slot = overlay.querySelector('[data-slot]') as HTMLElement

  try {
    const token = await new Promise<string>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('The human check timed out. Please try again.')), 90_000)
      window.turnstile!.render(slot, {
        sitekey: cfg.turnstileSiteKey,
        theme: 'dark',
        callback: (t: string) => {
          window.clearTimeout(timeout)
          resolve(t)
        },
        'error-callback': () => {
          window.clearTimeout(timeout)
          reject(new Error('The human check failed. Please try again.'))
        },
      })
    })
    const res = await fetch('/api/security/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'The human check failed.')
  } finally {
    overlay.remove()
  }
}
