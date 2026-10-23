import { ImageResponse } from 'next/og'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { db } from '@/lib/db'
import { asset, dataUri } from '@/lib/discord/assets'
import { Medal } from '@/lib/discord/medal'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { HttpError, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

const PAPER = '#f3f2ee'
const MUTE = 'rgba(243,242,238,0.56)'
const LINE = 'rgba(243,242,238,0.14)'

/**
 * A picture of what you have earned, to post or send: the total in large type, the clips and views behind it, your name and the badges you
 * show. It is drawn for the signed-in person only, from their own numbers, and carries nothing they have not got.
 */
export const GET = route(async (req: Request) => {
  if (!(await featureOn('earnings-share-card'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  await protect(req, { name: 'share-earnings', max: 20, windowSec: 600, userId: user.id })
  const origin = new URL(req.url).origin
  const d = await db()
  const [e, s, p] = await Promise.all([
    d.prepare('SELECT COALESCE(SUM(net_cents), 0) AS cents FROM earnings WHERE clipper_user_id = ?1').bind(user.id).first<{ cents: number }>(),
    d.prepare("SELECT COUNT(*) AS clips, COALESCE(SUM(views_verified), 0) AS views FROM submissions WHERE user_id = ?1 AND status = 'approved'").bind(user.id).first<{ clips: number; views: number }>(),
    d.prepare('SELECT handle, display_name, badges_json FROM profiles WHERE user_id = ?1').bind(user.id).first<{ handle: string; display_name: string; badges_json: string }>(),
  ])
  let ids: string[] = []
  try {
    ids = JSON.parse(p?.badges_json ?? '[]') as string[]
  } catch {
    ids = []
  }
  const badges = ids.map((id) => BADGE_BY_ID[id]).filter(Boolean).slice(0, 5)
  const [gloock, geist, logo] = await Promise.all([asset('/discord/fonts/Gloock-Regular.ttf', origin), asset('/discord/fonts/Geist-Regular.ttf', origin), asset('/logo-transparent.png', origin)])
  const fonts: { name: string; data: ArrayBuffer; weight: 400; style: 'normal' }[] = []
  if (geist) fonts.push({ name: 'Geist', data: geist, weight: 400, style: 'normal' })
  if (gloock) fonts.push({ name: 'Gloock', data: gloock, weight: 400, style: 'normal' })
  const total = `$${((e?.cents ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const headers: Record<string, string> = { 'cache-control': 'no-store' }
  if (new URL(req.url).searchParams.get('download')) headers['content-disposition'] = 'attachment; filename="logoless-earned.png"'
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#000000', color: PAPER, fontFamily: 'Geist', backgroundImage: 'radial-gradient(circle at 78% 35%, rgba(243,242,238,0.10), rgba(0,0,0,0) 55%)' }}>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUri(logo, 'image/png')} alt="" width={980} height={211} style={{ position: 'absolute', right: -120, top: 80, opacity: 0.1 }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '60px 72px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 26, color: MUTE, letterSpacing: 6 }}>
            <span style={{ color: PAPER, letterSpacing: 0, fontFamily: 'Gloock', fontSize: 34 }}>logoless</span>
            <span style={{ width: 1, height: 28, background: LINE }} />
            EARNED
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Gloock', fontSize: total.length > 10 ? 150 : 186, lineHeight: 1, letterSpacing: -4 }}>{total}</div>
            <div style={{ display: 'flex', fontSize: 36, marginTop: 26, color: MUTE }}>
              {`${(s?.clips ?? 0).toLocaleString('en-US')} approved ${s?.clips === 1 ? 'clip' : 'clips'}  ·  ${(s?.views ?? 0).toLocaleString('en-US')} verified views`}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${LINE}`, paddingTop: 26 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 34 }}>{p?.display_name ?? ''}</span>
              <span style={{ fontSize: 24, color: MUTE }}>{p ? `logoless.io/@${p.handle}` : 'logoless.io'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {badges.map((b) => (
                <Medal key={b.id} badge={b} size={76} />
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fonts.length ? fonts : undefined, headers },
  )
})
