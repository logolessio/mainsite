# logoless for Mac

A native Mac app for logoless.io, written in SwiftUI for macOS 26. It is not a web view: every screen is drawn natively from the site's JSON, and
it looks and works like the site (black, Gloock headings, paper-white pills) with real Liquid Glass (`glassEffect`) on everything that floats:
the top bar, the search, the filters and tabs, the menu, the bell, the buttons.

## Open it

Open `Logoless.xcodeproj` in Xcode and press Run, or run `./build.sh`, which writes `build/Logoless.app`. It is signed to run on this Mac only;
to share it, set a development team under Signing & Capabilities. Needs macOS 26 or later.

## How it is laid out (like the site)

- **Site**: a floating top bar (the mark, the bell, Dashboard, you, the menu), the home page (the promise, a search that pins as you scroll,
  filters, every campaign as its cover with the slide-up hover), a campaign page (cover and audio, the facts, the brief, Submit content), and the
  slide-in menu.
- **Dashboard** (the only place with a rail, as on the site): Overview, Submissions, Earnings, Profile (with Achievements and Saved), Settings
  (with Notifications). Owners also get Queue: approve or decline submissions and held withdrawals.
- **First launch**: a short welcome (what logoless is, how it pays), then sign in or create an account, a profile, and a PayPal email. Every step
  can be skipped. Settings -> "Show the welcome tour" plays it again.
- Keys: ⌘K jump to anything, ⌘1 to ⌘8 places, ⌘[ back, ⌘R refresh, ⇧⌘O open this page on logoless.io, Esc closes what floats or goes back.

## Signing in

The app never sees a password. "Sign in" opens logoless.io/app/connect in a system sheet (Google, Discord, email all work there). The site hands
back a one-use code; the app swaps it (with a PKCE secret it kept) for a token at `/api/app/token`, and sends it as `Authorization: Bearer lgl_...`.
The token is kept in the data-protection Keychain, or in a private file in the app's sandbox folder when the app is not signed for the Keychain.
Signing out revokes it on the server. See `lib/app-auth.ts` on the site.

## Files

`Logoless/Core` (API client, models, app state, sign-in), `Logoless/Components` (theme, glass controls), `Logoless/Views` (Site, Dash, Onboarding).
Xcode picks up any file added to those folders.

## Testing against a local site

Debug builds read `LOGOLESS_BASE` (for example `http://localhost:3111`) and `LOGOLESS_TOKEN` from the environment. `LOGOLESS_SNAPSHOT="home,dash:overview"`
draws pages into pictures in the app's temporary folder and quits (glass is drawn flat there). `LOGOLESS_ONBOARDING=1` forces the welcome tour.
