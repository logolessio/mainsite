// What the ⌘K box needs before it can show everything: the live campaigns (from the server) and the answers in the Q&A (a script of their own).
// Each is fetched once and kept, and can be started early (when the pointer reaches a search button, or a finger touches it), so by the time the box
// opens there is nothing left to wait for. Nothing here runs until somebody asks, so a page where search is never used pays nothing.

export type WarmCamp = { id: string; title: string; creator: string; type: string; cover: string; rate: number }
export type WarmFaq = { q: string; a: string; topic: string }

let camps: Promise<WarmCamp[]> | null = null
let faq: Promise<WarmFaq[]> | null = null

export const loadCampaigns = (): Promise<WarmCamp[]> => {
  camps ??= fetch('/api/search')
    .then((r) => r.json())
    .then((j: { campaigns?: WarmCamp[] }) => j.campaigns ?? [])
    .catch(() => {
      camps = null // try again next time
      return []
    })
  return camps
}

export const loadFaq = (): Promise<WarmFaq[]> => {
  faq ??= import('@/lib/faq')
    .then((m) => Object.entries(m.FAQ).flatMap(([topic, list]) => list.map((f) => ({ ...f, topic }))))
    .catch(() => {
      faq = null
      return []
    })
  return faq
}

/** Start both now. Safe to call as often as you like. */
export const warmSearch = () => {
  void loadCampaigns()
  void loadFaq()
}
