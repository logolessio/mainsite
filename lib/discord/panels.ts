import type { Health } from '../health'
import { LEGAL_LINKS, SITE } from '../site'
import { type Component, type Embed, type Message, WHITE, GREEN, RED, siteUrl } from './api'
import { channelUrl, type DiscordConfig } from './config'

/** The messages the bot posts in the fixed channels of the server: rules, site, get started, support and status. */
export const logoUrl = `${siteUrl}/logo-lg.png`
const btn = (label: string, url: string) => ({ type: 2 as const, style: 5 as const, label, url })
const row = (...b: Component['components']): Component => ({ type: 1, components: b })
const ch = (cfg: DiscordConfig, id: string, label: string) => (cfg.guildId && id ? [btn(label, channelUrl(cfg.guildId, id))] : [])

export function rulesMessage(cfg: DiscordConfig): Message {
  const rules: [string, string][] = [
    ['1. Be decent', 'No harassment, hate, slurs or threats. Disagree without going after people.'],
    ['2. Keep views real', 'No bought, botted or faked views, and no trading or selling them. It gets clips rejected and accounts banned.'],
    ['3. Follow the brief', 'Clip what a campaign asks for and nothing it forbids. Read the campaign page before you post.'],
    ['4. No spam or ads', 'No unrelated links, server invites or promotion. Post things in the right channel.'],
    ['5. No scams', 'The team will never DM you first, or ask for a password, a code or money. Report anyone who does.'],
    ['6. Keep private things private', 'Do not share other people’s details, and do not leak campaign material before it is public.'],
    ['7. Use the right place', 'Questions in help, ideas in suggestions, payment or account problems in a support ticket.'],
    ['8. Staff decisions stand', 'If you think we got it wrong, open a ticket. Do not argue it out in the channels.'],
    ['9. Discord’s rules apply too', 'Discord’s Terms of Service and Community Guidelines are part of ours.'],
  ]
  const embed: Embed = {
    title: 'Server rules',
    description: 'Short and fair. Break them and the team will act.',
    color: WHITE,
    thumbnail: { url: logoUrl },
    fields: rules.map(([name, value]) => ({ name, value })),
    footer: { text: 'By staying here you agree to these rules and to the logoless Terms of Service.' },
  }
  return {
    embeds: [embed],
    components: [
      row(btn('Terms of Service', `${siteUrl}${LEGAL_LINKS[0].href}`), btn('Campaign rules', `${siteUrl}${LEGAL_LINKS[4].href}`), btn('Questions', `${siteUrl}/faq`), ...ch(cfg, cfg.channels.getStarted, 'Get started'), ...ch(cfg, cfg.channels.support, 'Support')),
    ],
    allowed_mentions: { parse: [] },
  }
}

export function siteMessage(stats?: { campaigns: number; paidCents: number }): Message {
  const live = stats && stats.campaigns > 0 ? `${stats.campaigns} live ${stats.campaigns === 1 ? 'campaign' : 'campaigns'}${stats.paidCents > 0 ? ` · $${Math.floor(stats.paidCents / 100).toLocaleString('en-US')} paid to clippers` : ''}` : 'New campaigns land here first'
  const embed: Embed = {
    title: 'logoless.io',
    url: siteUrl,
    description: '**Views have value.**\nClip campaigns from artists, streamers and brands. Post your clip, and get paid for every 1,000 verified views.',
    color: WHITE,
    image: { url: logoUrl },
    fields: [
      { name: 'For creators', value: `Free to join. You keep everything you earn. Withdraw from $${SITE.minPayoutUsd} to any PayPal email.`, inline: true },
      { name: 'For brands', value: `One balance for every campaign. Pay only for verified views, plus a ${SITE.platformFeePct}% fee on top.`, inline: true },
      { name: 'We pay PayPal’s fees', value: 'Every deposit and every withdrawal, in full.', inline: false },
      { name: 'Right now', value: live, inline: false },
    ],
    footer: { text: 'logoless · views have value' },
  }
  return {
    embeds: [embed],
    components: [row(btn('Open logoless.io', siteUrl), btn('For creators', `${siteUrl}/for-clippers`), btn('For brands', `${siteUrl}/for-brands`), btn('Pricing', `${siteUrl}/pricing`), btn('Questions', `${siteUrl}/faq`))],
    allowed_mentions: { parse: [] },
  }
}

export function getStartedMessage(cfg: DiscordConfig): Message {
  const steps: [string, string][] = [
    ['1. Make your account', `Open **logoless.io/onboarding**. Choose creator or brand, pick a username and a picture. It asks for a code we email you (not needed if you sign in with Discord).`],
    ['2. Link Discord', 'On the site open **Settings**, press **Connect Discord**, then press **Link my account** below and paste the code. Linking unlocks the rest of the server, your roles and your notifications here.'],
    ['3. Add your PayPal email', `Go to **Earnings** and add the PayPal email you want to be paid at. Add as many as you like. We pay PayPal’s fees, so the whole amount arrives.`],
    ['4. Link your clipping accounts', 'Add the TikTok, YouTube or Instagram accounts you post from, in **Settings**. You choose whether they show on your profile.'],
    ['5. Pick a campaign', 'Use `/campaigns` here, or browse the site. Open one, play the preview and read the brief and the rules before you start.'],
    ['6. Post and submit', 'Post your clip on your own account, then send it with `/submit` or paste the link on the campaign page. We check it in seconds.'],
    ['7. Get paid', `Approved views turn into money. Earnings clear in ${SITE.holdDays} days, then you can withdraw from $${SITE.minPayoutUsd}.`],
  ]
  return {
    embeds: [
      { title: 'Welcome to logoless', description: 'You are in the right place. Setting up takes about three minutes. Follow the steps in order, and ask in a ticket if you get stuck.', color: WHITE, thumbnail: { url: logoUrl } },
      { title: 'Step by step', color: WHITE, fields: steps.map(([name, value]) => ({ name, value })), footer: { text: 'Brands: add funds once on your Balance page and every campaign draws from it.' } },
    ],
    components: [
      row(btn('Create your account', `${siteUrl}/onboarding`), { type: 2, style: 1, label: 'Link my account', custom_id: 'panel:link' }, { type: 2, style: 2, label: 'Live campaigns', custom_id: 'panel:campaigns' }, ...ch(cfg, cfg.channels.rules, 'Rules')),
    ],
    allowed_mentions: { parse: [] },
  }
}

export function supportPanel(): Message {
  return {
    embeds: [
      {
        title: 'Need a hand?',
        description: 'Press the button to open a private ticket. Only you and the team can see it. We answer right there, and you will be pinged.\n\nFor quick answers, `/faq` is instant.',
        color: WHITE,
        thumbnail: { url: logoUrl },
        footer: { text: 'Payment problems, account problems, anything: open a ticket.' },
      },
    ],
    components: [row({ type: 2, style: 1, label: 'Open a ticket', custom_id: 'ticket:open' }, btn('Questions', `${siteUrl}/faq`))],
    allowed_mentions: { parse: [] },
  }
}

const SERVICE: Record<string, string> = { database: 'Database', signin: 'Sign-in', payments: 'Payments (PayPal)', email: 'Email' }

/** Every logoless service on one card. */
export function statusMessage(h: Health): Message {
  const lines = [
    `${'🟢'} **Website** · logoless.io`,
    ...h.checks.map((c) => `${c.ok ? '🟢' : '🔴'} **${SERVICE[c.id] ?? c.label}**${c.ms !== undefined && c.ok ? ` · ${c.ms} ms` : ''}${c.ok ? '' : ' · not working right now'}`),
    '🟢 **Discord bot** · answering',
  ]
  const allOk = h.checks.every((c) => c.ok)
  return {
    embeds: [
      {
        title: allOk ? 'All systems operational' : 'Some services need attention',
        description: `${lines.join('\n')}\n\nUpdated <t:${h.at}:R>`,
        color: allOk ? GREEN : RED,
        footer: { text: 'logoless status' },
        timestamp: new Date(h.at * 1000).toISOString(),
      },
    ],
    components: [row(btn('Open logoless.io', siteUrl))],
    allowed_mentions: { parse: [] },
  }
}
