/** Auth.js sends a failed sign-in here with `?error=<code>`; it goes back to the login page, which says what to do. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = (url.searchParams.get('error') ?? 'Unknown').replace(/[^A-Za-z]/g, '').slice(0, 40) || 'Unknown'
  return Response.redirect(`${url.origin}/login?error=${code}`, 302)
}
