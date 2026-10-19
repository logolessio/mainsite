# logoless for Mac and iPhone

A native Mac app for logoless.io, written in SwiftUI for macOS 26. It is not a web view: every screen is drawn natively from the site's JSON, and
it looks and works like the site (black, Gloock headings, paper-white pills) with real Liquid Glass (`glassEffect`) on everything that floats:
the top bar, the search, the filters and tabs, the menu, the bell, the buttons.

## iPhone and iPad

The same project builds for iOS 26 (pick an iPhone or "Any iOS Device" as the destination in Xcode). On a phone the layout turns into one
column like the mobile site: the same top bar, a two-column cover grid, and the dashboard's bottom bar (Overview, Submissions, Earnings, Profile,
More) as a floating Liquid Glass capsule. To run it on a real iPhone, set a development team under Signing & Capabilities. Everything under
`Logoless/` is shared; `Core/Platform.swift` holds the few Mac/iPhone differences, and `\.compact` (width under 760) switches the layouts.

## Open it

Open `Logoless.xcodeproj` in Xcode and press Run, or run `./build.sh`, which writes `build/Logoless.app`. It is signed to run on this Mac only;
to share it, set a development team under Signing & Capabilities. Needs macOS 26 or later.

## How it is laid out (like the site)

The app is the site, with Apple's Liquid Glass on everything that floats. Every page of the site is in it:

- **Native screens** (drawn in SwiftUI from the site's JSON): the front page (the promise, a search that pins as you scroll, filters, every campaign as its
  cover with the slide-up hover), campaign pages (with the audio player and Submit content), the floating top bar, the slide-in menu with your profile card,
  the bell, and the creator dashboard: Overview, Submissions, Earnings (withdraw), Profile (with Achievements and Saved), Settings (with Notifications), and the
  owner's Queue. The dashboard is the only place with a rail, as on the site (a glass bottom bar on a phone).
- **Every other page of the site, inside the app** (`Views/Site/WebPageView.swift`): For creators, For brands, Pricing, About, Questions, Case studies, Contact,
  Leaderboard, Reels, Status, the legal pages, public profiles, linked accounts, the brand dashboard, the owner dashboard (`owner.logoless.io`) and so on. They are
  the site's own pages with no browser around them, already signed in (the app asks `/api/app/web-link` for a one-use link that sets the web session), and
  the site's own top bar is hidden because the app draws it (`data-app` on the page, `data-site-nav` on the bar). Links to a page the app has its own screen for
  (`/`, `/campaign/...`, `/dashboard/...`, `/login`, `/onboarding`) open that screen.
- **First launch**: the app opens straight into the site's onboarding (`Views/Onboarding`), step for step: a line typed out in large type, Creator or Brand,
  then one card, "Log in with logoless", which opens the website's own sign-in in a secure window (Google, Discord and email all work there; the site's own
  email and password steps happen in that window), the email code if the account still needs one, PayPal, name, username (checked live), a look or your own
  pictures, the accounts you post from, "Are you happy with how it looks?", the setting-up screen (with the white liquid when the owner has it switched on),
  proving the accounts with a code in the bio, your profile address, the tour and done. An account that has already been through it (on this or another
  device) skips it. Menu -> "Take the tour", or Profile -> "Show the welcome tour", plays it again.
- Keys: ⌘K jump to anything, ⌘1 to ⌘8 places, ⌘[ back (a web page goes back a page first), ⌘R refresh, ⇧⌘O open this page on logoless.io, Esc closes what floats or goes back.

## Signing in

The app never sees a password. "Sign in" opens logoless.io/app/connect in a system sheet (Google, Discord, email all work there). The site hands
back a one-use code; the app swaps it (with a PKCE secret it kept) for a token at `/api/app/token`, and sends it as `Authorization: Bearer lgl_...`.
The token is kept in the data-protection Keychain, or in a private file in the app's sandbox folder when the app is not signed for the Keychain.
Signing out revokes it on the server. See `lib/app-auth.ts` on the site.

## Motion

`Components/Motion.swift` is the one set of motion: the site's easing for everything (`Motion.ease`, `.quick`, `.page`), a settle-without-wobble spring for panels, `reveal()` for things that arrive in order (and never replay when scrolled back), `PressScale`, shimmer skeletons instead of spinners.
A page change is a single calm move (the old page fades while the new one rises), moving about the dashboard changes only the page (the rail's highlight glides), and figures settle with a numeric transition.
The Android and Windows app has the same in `flutter/lib/ui/motion.dart`.

## Following the Design page

`GET /api/app/v1/config` carries the site's Design choices that matter to the apps, and the Home page follows them: the campaign **layout**
(grid, large, compact, mosaic or list; `Views/Site/CampaignLayouts.swift`) and the **cover text** (when it shows, panel, size, letters, alignment, the line under
the name, and the typeface kind; `Views/CampaignCard.swift`). The apps carry Gloock; another typeface picked on the site is drawn in the system serif, sans or mono.
The onboarding tour (`Views/Onboarding/OBTour.swift`) is the site's walk through the dashboard, with a picture of each page.

## Files

`Logoless/Core` (API client, models, app state, sign-in, the looks), `Logoless/Components` (theme, glass controls, the site's moving background), `Logoless/Views` (Site, Dash, Onboarding).
Xcode picks up any file added to those folders.

## Testing against a local site

Debug builds read `LOGOLESS_OPEN=/pricing` (open a site page at launch; the web view reports what it loaded to stderr), `LOGOLESS_BASE` (for example `http://localhost:3111`) and `LOGOLESS_TOKEN` from the environment. `LOGOLESS_SNAPSHOT="home,dash:overview"`
draws pages into pictures in the app's temporary folder and quits (glass is drawn flat there). `LOGOLESS_ONBOARDING=1` forces the welcome tour.
