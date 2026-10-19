import { unsubscribe } from '@/lib/launch'

const page = (title: string, text: string) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="margin:0;background:#000;color:#f3f2ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;display:grid;place-items:center;min-height:100vh"><main style="max-width:420px;padding:32px;text-align:center"><h1 style="font:400 40px/1.1 Georgia,serif;margin:0 0 14px">${title}</h1><p style="margin:0;color:#a2a2a9;line-height:1.6">${text}</p></main></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  )

/** The link at the bottom of every launch update. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const ok = await unsubscribe(q.get('k') ?? '', q.get('t') ?? '')
  return ok ? page('You are unsubscribed.', 'We will not email you about the launch again.') : page('That link is not valid.', 'It may be old, or it was not copied in full.')
}
