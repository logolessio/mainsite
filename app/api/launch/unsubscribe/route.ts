import { unsubscribe } from '@/lib/launch'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

const page = (title: string, text: string, ok: boolean) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="color-scheme" content="dark"><title>${esc(title)} | logoless</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#f3f2ee;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;padding:24px;overflow:hidden}
body:before{content:'';position:fixed;inset:-20%;background:radial-gradient(40% 36% at 50% 38%,rgb(243 242 238/.09),transparent 70%);pointer-events:none}
main{position:relative;max-width:440px;text-align:center;animation:in .9s cubic-bezier(.22,1,.36,1) both}
img{height:46px;width:auto;margin:0 auto 34px;display:block;opacity:.95}
.mark{width:56px;height:56px;margin:0 auto 22px;border-radius:999px;display:grid;place-items:center;background:${ok ? '#f3f2ee' : 'transparent'};color:#000;border:1px solid rgb(243 242 238/.25)}
.mark svg{width:24px;height:24px;stroke-dasharray:30;stroke-dashoffset:30;animation:draw .7s .35s cubic-bezier(.22,1,.36,1) forwards}
h1{font:400 clamp(30px,7vw,42px)/1.1 Georgia,'Times New Roman',serif;margin:0 0 14px;letter-spacing:-.01em}
p{margin:0;color:#a2a2a9}a{color:#f3f2ee;text-underline-offset:4px}.links{margin-top:30px;font-size:14px;color:#6c6c75}
@keyframes in{from{opacity:0;transform:translateY(16px);filter:blur(10px)}}@keyframes draw{to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){main,.mark svg{animation:none;stroke-dashoffset:0}}
</style></head><body><main><img src="/logo-sm.png" alt="logoless"><div class="mark">${ok ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="#f3f2ee" stroke-width="2.2" stroke-linecap="round"><path d="M12 7v6M12 17h.01"/></svg>'}</div><h1>${esc(title)}</h1><p>${esc(text)}</p><p class="links"><a href="/">logoless.io</a></p></main></body></html>`,
    { status: ok ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  )

const run = async (req: Request) => {
  const q = new URL(req.url).searchParams
  return unsubscribe(q.get('k') ?? '', q.get('t') ?? '')
}

/** The link in every waitlist email: one click and they are off the list, with their username freed. Nothing to confirm. */
export async function GET(req: Request) {
  return (await run(req))
    ? page('You are unsubscribed.', 'You are off the logoless waitlist and your username is free again. We will not email you about the launch again.', true)
    : page('That link is not valid.', 'It may be old, or it was not copied in full. Try the link in the newest email from us.', false)
}

/** The mail app's own Unsubscribe button (List-Unsubscribe-Post: One-Click) posts here, to the same address. */
export async function POST(req: Request) {
  const ok = await run(req)
  return new Response(null, { status: ok ? 200 : 400, headers: { 'cache-control': 'no-store' } })
}
