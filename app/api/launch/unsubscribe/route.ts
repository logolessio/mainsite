import { unsubscribe } from '@/lib/launch'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

const page = (title: string, text: string, ok: boolean) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="color-scheme" content="dark"><title>${esc(title)} | logoless</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Schibsted+Grotesk:wght@800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000 url(/email/glow.jpg) no-repeat center top/min(1200px,100%) auto;color:#ededed;font:14px/1.75 'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:24px}
main{position:relative;width:100%;max-width:460px;text-align:left;padding:38px 36px 32px;border:1px solid #2b2b2b;border-radius:10px;background:rgba(8,8,8,.86);animation:in .9s cubic-bezier(.2,.8,.2,1) both}
img{height:34px;width:auto;margin:0 0 30px;display:block}
.eyebrow{display:flex;align-items:center;gap:.65rem;margin:0 0 22px;font-size:11px;line-height:1;letter-spacing:.14em;text-transform:uppercase;color:#b8b8b8}
.eyebrow:before{content:'';width:6px;height:6px;border-radius:99px;background:${ok ? '#2ed0b0' : '#ff1f38'};box-shadow:0 0 0 3px ${ok ? 'rgb(46 208 176/.16)' : 'rgb(255 31 56/.16)'},0 0 14px ${ok ? 'rgb(46 208 176/.7)' : 'rgb(255 31 56/.7)'}}
h1{font:900 clamp(30px,8vw,40px)/.98 'Schibsted Grotesk','Arial Black','Helvetica Neue',Helvetica,Arial,sans-serif;margin:0 0 16px;letter-spacing:-.03em;text-transform:uppercase}
p{margin:0;color:#b8b8b8}a{color:#ededed;text-underline-offset:4px}.links{margin-top:28px;padding-top:18px;border-top:1px solid #1d1d1d;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#686868}
@keyframes in{from{opacity:0;transform:translateY(14px)}}
@media (prefers-reduced-motion:reduce){main{animation:none}}
</style></head><body><main><img src="/logo-sm.png" alt="logoless"><p class="eyebrow">${ok ? 'Done' : 'Something is wrong'}</p><h1>${esc(title)}</h1><p>${esc(text)}</p><p class="links"><a href="/">logoless.io</a></p></main></body></html>`,
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
