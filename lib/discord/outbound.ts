import { db } from '../db'
import { campaignRow } from '../campaigns-db'
import { abs, botReady, type Embed, postMessage, siteUrl, WHITE } from './api'
import { getDiscordConfig } from './config'

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

/** A line in the team's log channel. Quiet when the bot is not set up. */
export async function logToDiscord(text: string) {
  try {
    const cfg = await getDiscordConfig()
    if (!cfg.channels.logs || !(await botReady())) return
    await postMessage(cfg.channels.logs, { content: text.slice(0, 1900), allowed_mentions: { parse: [] } })
  } catch {
    /* logging must never get in the way */
  }
}

/** A new campaign is live: tell the server, with a button to open it. */
export async function announceCampaign(campaignId: string) {
  try {
    const cfg = await getDiscordConfig()
    if (!cfg.channels.announce || !(await botReady())) return
    const c = await campaignRow(campaignId)
    if (!c) return
    const platforms = (() => {
      try {
        return (JSON.parse(c.platforms_json) as string[]).join(', ')
      } catch {
        return ''
      }
    })()
    const embed: Embed = {
      title: `New campaign: ${c.title}`,
      url: `${siteUrl}/campaign/${c.id}`,
      description: `${c.summary.slice(0, 300)}${c.summary.length > 300 ? '…' : ''}`,
      color: WHITE,
      thumbnail: abs(c.cover_url) ? { url: abs(c.cover_url)! } : undefined,
      fields: [
        { name: 'Pays', value: `${usd(c.rate_cents)} per 1,000 views`, inline: true },
        { name: 'Budget', value: usd(c.budget_cents), inline: true },
        ...(platforms ? [{ name: 'Platforms', value: platforms, inline: true }] : []),
      ],
      footer: { text: `${c.creator} · logoless` },
    }
    await postMessage(cfg.channels.announce, {
      embeds: [embed],
      components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Open the campaign', url: `${siteUrl}/campaign/${c.id}` }] }],
    })
  } catch {
    /* an announcement is a nice-to-have */
  }
}

/** Someone just earned a good amount: say so in the clips channel. */
export async function shoutout(clipperUserId: string, netCents: number, campaignTitle: string) {
  try {
    const cfg = await getDiscordConfig()
    if (!cfg.channels.clips || !(await botReady()) || netCents < 5000) return
    const d = await db()
    const p = await d.prepare("SELECT p.handle, p.display_name, p.show_json FROM profiles p WHERE p.user_id = ?1").bind(clipperUserId).first<{ handle: string; display_name: string; show_json: string }>()
    if (!p) return
    let showEarnings = false
    try {
      showEarnings = JSON.parse(p.show_json).earnings === true
    } catch {
      /* private by default */
    }
    await postMessage(cfg.channels.clips, {
      embeds: [{ description: showEarnings ? `**${p.display_name}** just earned **${usd(netCents)}** on **${campaignTitle}**.` : `**${p.display_name}** just got paid on **${campaignTitle}**.`, url: `${siteUrl}/@${p.handle}`, color: 0x5be09a }],
      allowed_mentions: { parse: [] },
    })
  } catch {
    /* ignore */
  }
}
