import type { Health } from '../health'
import type { Message } from './api'
import { logoUrl, siteCard, statusCard } from './cards'
import type { DiscordConfig } from './config'
import { rulesPanel, supportPanelNew, welcomePanel } from './panels-new'

/** The messages the bot posts in the fixed channels of the server: rules, site, get started, support and status. Built in cards.ts. */
export { logoUrl }
export const rulesMessage = (cfg: DiscordConfig): Message => rulesPanel({ rules: cfg.channels.rules, support: cfg.channels.support, getStarted: cfg.channels.getStarted, guildId: cfg.guildId })
export const siteMessage = (stats?: { campaigns: number; paidCents: number }): Message => siteCard(stats)
/** The welcome card in #get-started. `notice` is the "not live yet" line (see notice.ts), null once the site is open. The Get started button works the same with or without the one-button switch (welcome.ts). */
export const getStartedMessage = (cfg: DiscordConfig, _oneButton = false, notice: string | null = null): Message => welcomePanel({ rules: cfg.channels.rules, guildId: cfg.guildId }, notice)
export const supportPanel = (): Message => supportPanelNew()
export const statusMessage = (h: Health): Message => statusCard(h)
