/**
 * Which of the bot's own emoji (the gradient icons, uploaded by "Upload the gradient icons" in the owner dashboard) exist on Discord: icon name to emoji id.
 * Messages are built without waiting for the database, so this is a small cache that the places which send messages fill first (see icon-prime.ts). A name with
 * no id simply shows no icon. No database code in here: the dashboard's preview uses it too.
 */
let cache: Record<string, string> = {}

export const iconIds = () => cache
export function setIconCache(map: Record<string, string>) {
  cache = map
}
