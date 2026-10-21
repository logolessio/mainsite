import type { Health } from '../health'
import type { Message } from './api'
import { getStartedCard, logoUrl, rulesCard, siteCard, statusCard, supportPanelCard } from './cards'
import type { DiscordConfig } from './config'
import { startCard } from './cards-more'

/** The messages the bot posts in the fixed channels of the server: rules, site, get started, support and status. Built in cards.ts. */
export { logoUrl }
export const rulesMessage = (cfg: DiscordConfig): Message => rulesCard({ rules: cfg.channels.rules, support: cfg.channels.support, getStarted: cfg.channels.getStarted, guildId: cfg.guildId })
export const siteMessage = (stats?: { campaigns: number; paidCents: number }): Message => siteCard(stats)
/** With the one-button start switched on (`oneButton`), the new card: one Get started button (see welcome.ts). */
export const getStartedMessage = (cfg: DiscordConfig, oneButton = false): Message => (oneButton ? startCard() : getStartedCard({ rules: cfg.channels.rules, guildId: cfg.guildId }))
export const supportPanel = (): Message => supportPanelCard()
export const statusMessage = (h: Health): Message => statusCard(h)
