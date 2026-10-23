import { ImageResponse } from 'next/og'
import { db } from '@/lib/db'
import { asset, dataUri, imageData } from '@/lib/discord/assets'
import { censor, pctLeft } from '@/lib/discord/cards-more'
import { Medal } from '@/lib/discord/medal'
import { BADGE_BY_ID, type BadgeDef } from '@/lib/badges-defs'
import { lookById, lookFor, type Look } from '@/lib/looks'
import { profileByHandle, profileStats } from '@/lib/profile'

/**
 * The picture cards the bot puts in its messages, drawn on the fly (Satori and Resvg, through next/og, which runs on Workers).
 *  - payout/<earning id>: the amount in large type on the site's black background with the logo, the name half hidden
 *  - campaign/<campaign id>: the cover, the rate and a bar of the budget left
 *  - progress/<percent>: a rounded bar in the logo's gradient, as long as the percentage (the completion bar on a campaign card)
 *  - profile/<handle>: the banner, picture and name in their own colours, up to three numbers they show, and their badges as medals
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
const day = (t: number) => new Date(t * 1000).toLocaleDateString('en-GB')

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
        <img src={logo} alt="" width={980} height={211} style={{ position: 'absolute', right: -120, top: 70, opacity: 0.1 }} />
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

const NOIR: Look = { id: 'noir', name: 'Noir', light: '#2a2a2e', mid: '#101012', dark: '#030303' }
const SERIF_FONTS = ['serif', 'young', 'gloock', 'newsreader', 'regal']

type Prof = {
  name: string
  handle: string
  pronouns: string
  bio: string
  avatar: { src: string | null; look: Look; letter: string }
  banner: { src: string | null; look: Look | null; color: string | null }
  accent: string
  serif: boolean
  glow: boolean
  stats: { label: string; value: string }[]
  badges: BadgeDef[]
  since: string | null
}

/** The picture and banner CSS for a look, without the grain (the card renderer cannot draw filters). */
const lookBg = (l: Look) => `radial-gradient(circle at 12% 0%, ${l.light}, rgba(0,0,0,0) 62%), linear-gradient(135deg, ${l.mid}, ${l.dark})`
const bright = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000
}

async function profileData(handle: string): Promise<Prof | null> {
  if (handle === 'sample') {
    return {
      name: 'Luna Ray',
      handle: 'luna_ray',
      pronouns: 'she/her',
      bio: 'Cutting clips since 2021. Mostly pop and late-night live sets.',
      avatar: { src: null, look: lookById('violet') ?? lookFor('luna'), letter: 'L' },
      banner: { src: null, look: lookById('dusk') ?? NOIR, color: null },
      accent: '#d9d4ff',
      serif: true,
      glow: true,
      stats: [
        { label: 'Submissions', value: '42' },
        { label: 'Views', value: '318,400' },
        { label: 'Earned', value: '$796' },
      ],
      badges: ['first-clip', 'views-100k', 'earn-1k', 'founding', 'showcase'].map((id) => BADGE_BY_ID[id]).filter(Boolean),
      since: 'Mar 2026',
    }
  }
  if (!/^[\w.-]{1,40}$/.test(handle)) return null
  const found = await profileByHandle(handle)
  if (!found || found.suspended) return null
  const v = found.view
  if (v.extras.privacy.profile !== 'public') return null // a page that is not public gets no picture either
  const s = await profileStats(found.userId)
  const stats = [
    v.show.clips && { label: 'Submissions', value: s.clips.toLocaleString('en-US') },
    v.show.views && { label: 'Views', value: s.views.toLocaleString('en-US') },
    v.show.earnings && { label: 'Earned', value: whole(s.earnedCents) },
    v.show.campaigns && { label: 'Campaigns', value: s.campaigns.toLocaleString('en-US') },
  ].filter(Boolean) as { label: string; value: string }[]
  const look = v.avatar?.startsWith('/api/look/') ? lookById(v.avatar.slice('/api/look/'.length).split('?')[0]) : null
  return {
    name: v.displayName,
    handle: v.handle,
    pronouns: v.pronouns,
    bio: v.bio,
    avatar: { src: v.avatar?.startsWith('/api/img/') ? v.avatar : null, look: look ?? lookFor(v.handle), letter: (v.displayName.trim()[0] ?? v.handle[0] ?? '').toUpperCase() },
    banner: v.bannerKind === 'image' ? { src: v.banner, look: null, color: null } : v.bannerKind === 'color' && /^#[0-9a-f]{6}$/i.test(v.banner) ? { src: null, look: null, color: v.banner } : { src: null, look: lookById(v.banner) ?? NOIR, color: null },
    accent: /^#[0-9a-f]{6}$/i.test(v.accent) ? v.accent : PAPER,
    serif: SERIF_FONTS.includes(v.font),
    glow: v.nameEffect !== 'solid',
    stats: stats.slice(0, 3),
    badges: v.show.badges ? v.badges.map((id) => BADGE_BY_ID[id]).filter(Boolean).slice(0, 5) : [],
    since: v.show.joined ? new Date(v.joinedAt * 1000).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : null,
  }
}

function ProfileCard({ p, avatar, banner }: { p: Prof; avatar: string | null; banner: string | null }) {
  const nameColor = p.glow && bright(p.accent) > 90 ? p.accent : PAPER
  const bannerStyle = p.banner.color ? { backgroundColor: p.banner.color } : { backgroundImage: lookBg(p.banner.look ?? NOIR) }
  const size = p.name.length > 22 ? 44 : p.name.length > 15 ? 54 : 66
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: INK, color: PAPER, fontFamily: 'Geist' }}>
      {banner ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner} alt="" width={1200} height={240} style={{ position: 'absolute', left: 0, top: 0, objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 240, display: 'flex', ...bannerStyle }} />
      )}
      <div style={{ position: 'absolute', left: 0, top: 100, width: 1200, height: 140, display: 'flex', backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0), #000000)' }} />
      <div style={{ position: 'absolute', right: 64, top: 40, display: 'flex', fontFamily: 'Gloock', fontSize: 32, color: PAPER, opacity: 0.9 }}>logoless</div>

      <div style={{ position: 'absolute', left: 64, top: 136, width: 172, height: 172, borderRadius: 86, border: `8px solid ${INK}`, display: 'flex', overflow: 'hidden', background: INK }}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" width={156} height={156} style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 156, height: 156, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: lookBg(p.avatar.look), fontFamily: 'Geist', fontSize: 78, color: PAPER }}>{p.avatar.letter}</div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 64, top: 322, width: 540, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontFamily: p.serif ? 'Gloock' : 'Geist', fontSize: size, lineHeight: 1.05, letterSpacing: -1, color: nameColor, ...(p.glow ? { textShadow: `0 0 28px ${p.accent}` } : {}), overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.name}</div>
        <div style={{ display: 'flex', marginTop: 12, fontSize: 28, color: MUTE }}>
          {[`@${p.handle}`, p.pronouns].filter(Boolean).join('  ·  ')}
        </div>
        <div style={{ display: 'flex', width: 120, height: 4, borderRadius: 2, marginTop: 22, background: p.accent }} />
        {p.bio ? <div style={{ display: 'flex', marginTop: 20, fontSize: 25, lineHeight: 1.4, color: PAPER, opacity: 0.8, maxHeight: 70, overflow: 'hidden' }}>{p.bio.length > 110 ? `${p.bio.slice(0, 109).trimEnd()}…` : p.bio}</div> : null}
      </div>

      <div style={{ position: 'absolute', right: 64, top: 276, width: 480, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        {p.badges.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', fontSize: 20, color: MUTE, letterSpacing: 5, marginBottom: 16 }}>BADGES</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {p.badges.map((b) => (
                <Medal key={b.id} badge={b} size={86} />
              ))}
            </div>
          </div>
        )}
        {p.stats.length > 0 && (
          <div style={{ display: 'flex', gap: 44, marginTop: p.badges.length ? 34 : 0, paddingTop: 24, borderTop: `1px solid ${LINE}` }}>
            {p.stats.map((x) => (
              <div key={x.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', fontFamily: 'Gloock', fontSize: 46, lineHeight: 1 }}>{x.value}</div>
                <div style={{ display: 'flex', fontSize: 20, color: MUTE, marginTop: 8 }}>{x.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', left: 64, right: 64, bottom: 28, display: 'flex', justifyContent: 'space-between', fontSize: 22, color: MUTE }}>
        <span>{p.since ? `Member since ${p.since}` : ''}</span>
        <span>{`logoless.io/@${p.handle}`}</span>
      </div>
    </div>
  )
}

export async function GET(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  const origin = new URL(req.url).origin
  try {
    const headers = { 'cache-control': id === 'sample' ? 'public, max-age=300' : 'public, max-age=60, s-maxage=60' }
    if (kind === 'progress') {
      // a rounded bar filled with the logo's gradient, the length of the percentage in the id (the words are in the message itself)
      const pct = Math.max(0, Math.min(100, Math.round(Number(id)) || 0))
      return new ImageResponse(
        (
          <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', width: '100%', height: 30, borderRadius: 15, border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', padding: 3 }}>
              <div
                style={{
                  display: 'flex',
                  width: `${pct}%`,
                  minWidth: pct > 0 ? 22 : 0,
                  height: '100%',
                  borderRadius: 12,
                  backgroundImage: 'linear-gradient(90deg, #ff1f38, #ff2d96 28%, #9650ff 55%, #4678ff 80%, #4ba9dc)',
                  backgroundSize: '710px 100%',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </div>
          </div>
        ),
        { width: 720, height: 46, headers },
      )
    }
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
    if (kind === 'profile') {
      const p = await profileData(id)
      if (!p) return new Response('Not found', { status: 404 })
      const [f, avatar, banner] = await Promise.all([fonts(origin), imageData(p.avatar.src, origin), imageData(p.banner.src, origin)])
      return new ImageResponse(<ProfileCard p={p} avatar={avatar} banner={banner} />, { width: 1200, height: 630, fonts: f.length ? f : undefined, headers })
    }
    return new Response('Not found', { status: 404 })
  } catch (e) {
    console.error('discord card failed', e instanceof Error ? e.message : e)
    return new Response('Could not draw that card', { status: 500 })
  }
}
