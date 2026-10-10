import { getCloudflareContext } from '@opennextjs/cloudflare'
import { ipHash } from './guard'
import { db } from './db'

/**
 * Looks at where a request came from using what Cloudflare already tells us (country and the network that owns the
 * address). Networks that belong to VPNs, proxies and data centres are flagged. A flag never blocks anyone:
 * it switches on the extended checks (slower payouts, manual review of withdrawals, an admin warning).
 * This is a heuristic, not proof. A paid IP-reputation service could be added later for sharper results.
 */
const HOSTING_OR_VPN =
  /\b(m247|datacamp|cdn77|nordvpn|nordlayer|tefincom|mullvad|31173|proton|expressvpn|express vpn|surfshark|private internet access|cyberghost|ipvanish|windscribe|hide\.?me|hidemyass|tunnelbear|vyprvpn|perfect privacy|ovh|hetzner|digitalocean|linode|vultr|choopa|leaseweb|amazon|aws|google cloud|google llc|microsoft|azure|oracle|alibaba|tencent|contabo|scaleway|packethub|quadranet|psychz|zenlayer|frantech|buyvm|sharktech|serverius|hostinger|hostwinds|ionos|colocrossing|path network|bright ?data|luminati|oxylabs|smartproxy|proxy|vpn|hosting|datacenter|data center|cloud)\b/i

export type Risk = {
  level: 'low' | 'elevated'
  reasons: string[]
  country: string | null
  asn: number | null
  org: string | null
}

export async function assessRequest(req: Request): Promise<Risk> {
  let cf: Record<string, unknown> = {}
  try {
    cf = ((await getCloudflareContext({ async: true })).cf ?? {}) as Record<string, unknown>
  } catch {
    /* local dev: no Cloudflare data */
  }
  const org = typeof cf.asOrganization === 'string' ? cf.asOrganization : null
  const asn = typeof cf.asn === 'number' ? cf.asn : null
  const country = typeof cf.country === 'string' ? cf.country : (req.headers.get('cf-ipcountry') ?? null)
  const reasons: string[] = []
  if (org && HOSTING_OR_VPN.test(org)) reasons.push(`VPN, proxy or data-centre network (${org})`)
  if (country === 'T1') reasons.push('Tor network')
  return { level: reasons.length ? 'elevated' : 'low', reasons, country, asn, org }
}

/** Records the sign-up network on a brand new account and raises the risk level if needed. */
export async function recordSignup(userId: string, req: Request) {
  const r = await assessRequest(req)
  const d = await db()
  await d
    .prepare(
      `UPDATE users SET signup_country = ?2, signup_asn = ?3, signup_ip_hash = ?4,
         risk_level = CASE WHEN ?5 = 'elevated' THEN 'elevated' ELSE risk_level END,
         risk_reasons = CASE WHEN ?5 = 'elevated' THEN ?6 ELSE risk_reasons END
       WHERE id = ?1`,
    )
    .bind(userId, r.country, r.asn, await ipHash(req), r.level, r.reasons.length ? `Sign-up: ${r.reasons.join('; ')}` : null)
    .run()
  return r
}

/** True when this account has extra checks switched on. */
export const needsExtraChecks = (u: { risk_level: string }) => u.risk_level !== 'low'
