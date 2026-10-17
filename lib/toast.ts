/** A short message that appears for a moment: "Saved", "Copied". Safe to call from anywhere in the browser. */
export type ToastInput = { text: string; tone?: 'ok' | 'error' | 'info'; ms?: number }
export const TOAST_EVENT = 'logoless:toast'

function send(t: ToastInput) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<ToastInput>(TOAST_EVENT, { detail: t }))
}

export const toast = Object.assign((text: string | ToastInput) => send(typeof text === 'string' ? { text } : text), {
  ok: (text: string) => send({ text, tone: 'ok' }),
  error: (text: string) => send({ text, tone: 'error', ms: 6500 }),
})
