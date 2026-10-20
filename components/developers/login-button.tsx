import { LogolessMark, MARK_SVG } from './logoless-mark'

/** The button to put on a sign-in page. A pill, white on dark, the mark and plain words. */
export function LoginWithLogoless({ href = '#', dark = false, onClick }: { href?: string; dark?: boolean; onClick?: React.MouseEventHandler<HTMLAnchorElement> }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex h-12 shrink-0 items-center gap-3 rounded-pill pr-6 pl-5 text-[15px] font-medium whitespace-nowrap no-underline transition-opacity hover:opacity-90 ${dark ? 'border border-white/15 bg-black text-white' : 'bg-white text-black'}`}
    >
      <LogolessMark className="h-[22px] w-[30px] shrink-0 overflow-visible" />
      Continue with logoless
    </a>
  )
}

export const BUTTON_SNIPPET = `<a href="YOUR_AUTHORIZE_URL"
   style="display:inline-flex;align-items:center;gap:12px;height:48px;padding:0 24px 0 20px;border-radius:999px;
          background:#fff;color:#000;font:500 15px system-ui,sans-serif;text-decoration:none;white-space:nowrap">
  ${MARK_SVG.replace('<svg ', '<svg style="flex-shrink:0;overflow:visible" ')}
  Continue with logoless
</a>`
