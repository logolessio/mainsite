/**
 * Auth.js sends a failed sign-in here with `?error=<code>`. Someone who started on the pre-launch sign-up goes back to it (with the reason, so it can say what to
 * do), anyone else to the login page. Where they started is in the callback-url cookie Auth.js keeps for the length of the sign-in.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = (url.searchParams.get('error') ?? 'Unknown').replace(/[^A-Za-z]/g, '').slice(0, 40) || 'Unknown'
  const raw = /(?:^|;\s*)(?:__Secure-)?authjs\.callback-url=([^;]+)/.exec(req.headers.get('cookie') ?? '')?.[1] ?? ''
  let back = ''
  try {
    back = decodeURIComponent(raw)
  } catch {
    /* not a readable address */
  }
  const beta = /^https:\/\/beta\.logoless\.io(\/|$)/.test(back)
  const local = /^http:\/\/beta\.localhost(:\d{2,5})?(\/|$)/.exec(back)
  if (beta) return Response.redirect(`https://beta.logoless.io/onboarding?signin=failed&why=${code}`, 302)
  if (local) return Response.redirect(`${local[0].replace(/\/$/, '')}/onboarding?signin=failed&why=${code}`, 302)
  return Response.redirect(`${url.origin}/login?error=${code}`, 302)
}
