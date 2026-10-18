# logoless for Mac

A native Mac app for logoless.io, written in SwiftUI. The pages are the site itself (in a web view), and the window around them is
native macOS 26 Liquid Glass: a floating glass sidebar, a glass toolbar, and a floating glass bar at the bottom (built with
`GlassEffectContainer` and `glassEffect`, so the pills melt into each other as you move between places).

## Open it

Open `Logoless.xcodeproj` in Xcode and press Run. Or run `./build.sh`, which writes `build/Logoless.app` (drag it to Applications).
It is signed to run on this Mac only; to share it, set a development team under Signing & Capabilities.

Needs macOS 26 or later.

## What is in it

- **Sidebar**: Browse, Creator, Brand, Owner (owner.logoless.io) and Help. It follows the page you are on.
- **Glass bar**: Discover, Dashboard, Earnings, Profile.
- **Toolbar**: back, forward, the site's own search (also ⌘K), reload, copy link, open in the browser.
- **Menus and keys**: ⌘[ ⌘] back and forward, ⌘R reload, ⌘1 to ⌘5 jump to Campaigns, Dashboard, Earnings, Profile, Settings, ⌘F find, ⌘+ ⌘- ⌘0 zoom.
- Sign-in is kept between launches. Pages on logoless.io, its owner and dev sites, and the sign-in and payment pages (Google, Discord, PayPal) open
  inside the app; any other link opens in your browser. File uploads, "leave without saving?" prompts and exports (downloads go to Downloads) work.

## Files

`Logoless/` holds the Swift sources (`Site.swift` is the map of places, `Browser.swift` the web view and what the interface needs from it,
`QuickBar.swift` the glass bar). Xcode picks up any file you add to that folder.
