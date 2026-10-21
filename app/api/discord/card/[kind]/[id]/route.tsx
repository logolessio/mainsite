import { ImageResponse } from 'next/og'
import { db } from '@/lib/db'
import { asset, dataUri, imageData } from '@/lib/discord/assets'
import { censor, pctLeft } from '@/lib/discord/cards-more'

/**
 * The picture cards the bot puts in its messages, drawn on the fly (Satori and Resvg, through next/og, which runs on Workers).
 *  - payout/<earning id>: the amount in large type on the site's black background with the logo, the name half hidden
 *  - campaign/<campaign id>: the cover, the rate and a bar of the budget left
 * "sample" as the id draws one with made-up numbers (the previews in the admin area use it).
 * The look follows the site: black, the paper white (#f3f2ee), Gloock for figures. It is all in this one file, so it can be
 * tuned to the owner's reference images in one place.
 */
const INK = '#000000'
const PAPER = '#f3f2ee'
const MUTE = 'rgba(243,242,238,0.56)'
const LINE = 'rgba(243,242,238,0.14)'

const money = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const whole = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')}`
const day = (t: number) => new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

async function fonts(origin: string) {
  const [gloock, geist] = await Promise.all([asset('/discord/fonts/Gloock-Regular.ttf', origin), asset('/discord/fonts/Geist-Regular.ttf', origin)])
  const out: { name: string; data: ArrayBuffer; weight: 400; style: 'normal' }[] = []
  if (geist) out.push({ name: 'Geist', data: geist, weight: 400, style: 'normal' })
  if (gloock) out.push({ name: 'Gloock', data: gloock, weight: 400, style: 'normal' })
  return out
}

type Payout = { cents: number; name: string; campaign: string; views: number | null; rateCents: number | null; at: number }
type Camp = { title: string; creator: string; cover: string | null; rateCents: number; budgetCents: number; paidCents: number; status: string; platforms: string[] }

async function payoutData(id: string): Promise<Payout | null> {
  if (id === 'sample') return { cents: 12450, name: 'emile', campaign: 'Red Room, the new single', views: 49800, rateCents: 250, at: Math.floor(Date.now() / 1000) }
  if (!/^[\w-]{8,64}$/.test(id)) return null
  const d = await db()
  const r = await d
    .prepare(
      `SELECT e.net_cents, e.note, e.created_at, e.campaign, c.rate_cents, COALESCE(p.handle, p.display_name, u.name, 'creator') AS name
       FROM earnings e LEFT JOIN campaigns c ON c.id = e.campaign_id LEFT JOIN profiles p ON p.user_id = e.clipper_user_id LEFT JOIN users u ON u.id = e.clipper_user_id
       WHERE e.id = ?1`,
    )
    .bind(id)
    .first<{ net_cents: number; note: string | null; created_at: number; campaign: string; rate_cents: number | null; name: string }>()
  if (!r) return null
  const views = Number(/^(\d+) views/.exec(r.note ?? '')?.[1] ?? NaN)
  return { cents: r.net_cents, name: r.name, campaign: r.campaign, views: Number.isFinite(views) ? views : null, rateCents: r.rate_cents, at: r.created_at }
}

async function campaignData(id: string): Promise<Camp | null> {
  if (id === 'sample') return { title: 'Red Room, the new single', creator: 'Luna Ray', cover: '/covers/01.jpg', rateCents: 250, budgetCents: 500000, paidCents: 180000, status: 'live', platforms: ['tiktok', 'youtube', 'instagram'] }
  if (!/^[\w-]{1,80}$/.test(id)) return null
  const d = await db()
  const c = await d.prepare("SELECT title, creator, cover_url, rate_cents, budget_cents, status, platforms_json FROM campaigns WHERE id = ?1 AND status IN ('live','paused','ended')").bind(id).first<{ title: string; creator: string; cover_url: string; rate_cents: number; budget_cents: number; status: string; platforms_json: string }>()
  if (!c) return null
  const paid = await d.prepare('SELECT COALESCE(SUM(net_cents), 0) AS n FROM earnings WHERE campaign_id = ?1').bind(id).first<{ n: number }>()
  let platforms: string[] = []
  try {
    platforms = JSON.parse(c.platforms_json)
  } catch {
    /* none */
  }
  return { title: c.title, creator: c.creator, cover: c.cover_url, rateCents: c.rate_cents, budgetCents: c.budget_cents, paidCents: paid?.n ?? 0, status: c.status, platforms }
}

const PLATFORM: Record<string, string> = { tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram' }

function PayoutCard({ p, logo }: { p: Payout; logo: string | null }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: INK, color: PAPER, fontFamily: 'Geist', backgroundImage: 'radial-gradient(circle at 78% 40%, rgba(243,242,238,0.10), rgba(0,0,0,0) 55%)' }}>
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" width={620} height={465} style={{ position: 'absolute', right: -60, top: 80, opacity: 0.16 }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 26, color: MUTE, letterSpacing: 6 }}>
          <span style={{ color: PAPER, letterSpacing: 0, fontFamily: 'Gloock', fontSize: 34 }}>logoless</span>
          <span style={{ width: 1, height: 28, background: LINE }} />
          PAYOUT
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Gloock', fontSize: p.cents >= 1_000_000 ? 150 : 180, lineHeight: 1, letterSpacing: -4 }}>{money(p.cents)}</div>
          <div style={{ display: 'flex', fontSize: 38, marginTop: 26 }}>
            <span>{censor(p.name)}</span>
            <span style={{ color: MUTE, margin: '0 14px' }}>earned on</span>
            <span style={{ maxWidth: 620, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.campaign}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${LINE}`, paddingTop: 26, fontSize: 24, color: MUTE }}>
          <div style={{ display: 'flex', gap: 34 }}>
            {p.views ? <span>{p.views.toLocaleString('en-US')} verified views</span> : null}
            {p.rateCents ? <span>{money(p.rateCents)} per 1,000</span> : null}
            <span>{day(p.at)}</span>
          </div>
          <span style={{ color: PAPER }}>logoless.io</span>
        </div>
      </div>
    </div>
  )
}

function CampaignCard({ c, cover }: { c: Camp; cover: string | null }) {
  const left = pctLeft(c.budgetCents, c.paidCents)
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: INK, color: PAPER, fontFamily: 'Geist', padding: 48, gap: 48, backgroundImage: 'radial-gradient(circle at 85% 0%, rgba(243,242,238,0.09), rgba(0,0,0,0) 60%)' }}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" width={404} height={404} style={{ borderRadius: 32, objectFit: 'cover', filter: c.status === 'live' ? 'none' : 'grayscale(1)' }} />
      ) : (
        <div style={{ width: 404, height: 404, borderRadius: 32, background: '#121214', display: 'flex' }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 26, color: MUTE, letterSpacing: 4 }}>{`${c.creator.toUpperCase()} · ${c.status === 'live' ? 'LIVE' : c.status.toUpperCase()}`}</div>
          <div style={{ fontFamily: 'Gloock', fontSize: c.title.length > 34 ? 52 : 64, lineHeight: 1.05, marginTop: 14, letterSpacing: -1 }}>{c.title}</div>
          <div style={{ display: 'flex', fontSize: 30, marginTop: 22 }}>
            <span>{money(c.rateCents)}</span>
            <span style={{ color: MUTE, marginLeft: 10 }}>per 1,000 views</span>
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: MUTE, marginTop: 8 }}>{c.platforms.map((p) => PLATFORM[p] ?? p).join('  ·  ')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <span style={{ fontSize: 24, color: MUTE }}>Budget left</span>
            <span style={{ fontFamily: 'Gloock', fontSize: 56, lineHeight: 1 }}>{`${left}%`}</span>
          </div>
          <div style={{ display: 'flex', width: '100%', height: 22, borderRadius: 11, background: 'rgba(243,242,238,0.12)', overflow: 'hidden' }}>
            <div style={{ width: `${left}%`, height: '100%', borderRadius: 11, background: PAPER }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: MUTE, marginTop: 12 }}>
            <span>{`${whole(Math.max(0, c.budgetCents - c.paidCents))} of ${whole(c.budgetCents)}`}</span>
            <span style={{ color: PAPER }}>logoless.io</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export async function GET(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  const origin = new URL(req.url).origin
  try {
    const headers = { 'cache-control': id === 'sample' ? 'public, max-age=300' : 'public, max-age=60, s-maxage=60' }
    if (kind === 'payout') {
      const p = await payoutData(id)
      if (!p) return new Response('Not found', { status: 404 })
      const [f, logo] = await Promise.all([fonts(origin), asset('/logo-transparent.png', origin)])
      return new ImageResponse(<PayoutCard p={p} logo={logo ? dataUri(logo, 'image/png') : null} />, { width: 1200, height: 630, fonts: f.length ? f : undefined, headers })
    }
    if (kind === 'campaign') {
      const c = await campaignData(id)
      if (!c) return new Response('Not found', { status: 404 })
      const [f, cover] = await Promise.all([fonts(origin), imageData(c.cover, origin)])
      return new ImageResponse(<CampaignCard c={c} cover={cover} />, { width: 1200, height: 500, fonts: f.length ? f : undefined, headers })
    }
    return new Response('Not found', { status: 404 })
  } catch (e) {
    console.error('discord card failed', e instanceof Error ? e.message : e)
    return new Response('Could not draw that card', { status: 500 })
  }
}
