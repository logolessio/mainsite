/** The button to put on a sign-in page. A pill, white on dark, the wordmark and plain words. */
export function LoginWithLogoless({ href = '#', dark = false }: { href?: string; dark?: boolean }) {
  return (
    <a
      href={href}
      className={`inline-flex h-12 items-center gap-3 rounded-pill px-6 text-[15px] font-medium no-underline transition-opacity hover:opacity-90 ${dark ? 'border border-black/20 bg-black text-white' : 'bg-white text-black'}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-sm.png" alt="" width={27} height={20} className={dark ? 'h-5 w-auto' : 'h-5 w-auto invert'} />
      Continue with logoless
    </a>
  )
}

export const BUTTON_SNIPPET = `<a href="YOUR_AUTHORIZE_URL"
   style="display:inline-flex;align-items:center;gap:12px;height:48px;padding:0 24px;border-radius:999px;
          background:#fff;color:#000;font:500 15px system-ui,sans-serif;text-decoration:none">
  <img src="https://logoless.io/logo-sm.png" alt="" height="20" style="filter:invert(1)">
  Continue with logoless
</a>`
