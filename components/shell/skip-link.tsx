'use client'

/** The first thing a keyboard reaches: a way past the menus to the page itself. Every page has one <main>, so it needs no id. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="skip-link"
      onClick={(e) => {
        const main = document.querySelector('main')
        if (!main) return
        e.preventDefault()
        main.setAttribute('tabindex', '-1')
        main.focus({ preventScroll: true })
        main.scrollIntoView({ block: 'start' })
      }}
    >
      Skip to the page
    </a>
  )
}
