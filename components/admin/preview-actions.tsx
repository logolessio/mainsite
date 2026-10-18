'use client'

export const PREVIEW_TOAST = 'logoless:preview-toast'
export const PREVIEW_CALM = 'logoless:preview-calm'

const btn = 'inline-flex h-10 items-center justify-center rounded-pill border border-line-strong px-5 text-sm transition-colors hover:border-paper hover:bg-white/[0.06]'

/** Buttons that fire the site's small pop-ups on demand, so an admin can see them without waiting for the real thing. */
export function PreviewActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" className={btn} onClick={() => window.dispatchEvent(new CustomEvent(PREVIEW_TOAST))}>
        Drop a notification from the top
      </button>
      <button type="button" className={btn} onClick={() => window.dispatchEvent(new CustomEvent(PREVIEW_CALM))}>
        Show the calm mode pop-up
      </button>
    </div>
  )
}
