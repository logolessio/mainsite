# logoless for Android and Windows

One Flutter codebase for the Android and Windows apps. It is not a web view: every screen is drawn natively from the site's JSON, and it looks and
works like logoless.io (black, Gloock headings, paper-white pills, frosted glass on everything that floats). The iPhone, iPad and Mac apps are in
`../macos` (SwiftUI with real Liquid Glass); this is the same design for the other two platforms.

## What is in it

- The site: floating top bar, home (the promise, a search that pins as you scroll, filters, every campaign as its cover with the slide-up hover),
  campaign pages with the audio player, Submit content, the slide-in menu and the bell.
- The dashboard: Overview, Submissions, Earnings (withdraw to PayPal), Profile (with Achievements and Saved), Settings (with Notifications), and the
  owner's Queue. A left rail on a wide window (Windows), a bottom bar on a phone (Android).
- First launch: the site's own onboarding, step for step (a line typed out in large type, Creator or Brand, "Log in with logoless" opening the sign-in window, the email code if needed, PayPal, name, username, a look or your own pictures, the accounts you post from, "Are you happy", setting up, bio verification, tour, done). The app opens straight into it; an account that has finished it (here or elsewhere) skips it. Settings -> "Show the welcome tour" plays it again.
- Pages that have no screen of their own (pricing, for brands, the brand dashboard...) open in the browser here; the Mac and iPhone apps show them inside the app.
- Ctrl+K jumps to any page or campaign. Esc closes what floats or goes back (the Android back button does the same).

## Signing in

The app never sees a password. "Sign in" opens logoless.io/app/connect in the system browser; the site hands back a one-use code and the app swaps it
(with a PKCE secret it kept) for a token at `/api/app/token`. On Android the browser returns to `logoless://auth`; on Windows the app listens on
`http://127.0.0.1:<port>/callback` for a moment (RFC 8252). The token is kept with `flutter_secure_storage` (Android Keystore, Windows Credential
Manager) and sent as `Authorization: Bearer lgl_...`. Signing out revokes it on the server.

## Build it

Install Flutter (3.47 or newer), then in this folder:

```bash
flutter pub get
flutter run -d windows          # or an Android device or emulator
flutter build apk --release     # build/app/outputs/flutter-apk/app-release.apk (signed with the debug key; add your own for the Play Store)
flutter build windows --release # build/windows/x64/runner/Release
```

GitHub builds both on every change (`.github/workflows/apps.yml`): open the run and download `logoless-android` or `logoless-windows`.

`--dart-define=LOGOLESS_BASE=http://localhost:3111` points a build at a site running on your machine; `--dart-define=LOGOLESS_ONBOARDING=1` forces
the welcome tour; `--dart-define=LOGOLESS_TOKEN=lgl_...` signs in with a token you made.

## Looking at the screens without a device

```bash
flutter test test_screens --update-goldens   # writes test_screens/goldens/*.png (home, campaign, dashboard pages, on desktop and phone sizes)
```

`flutter test` runs the unit tests in `test/`.

## Files

`lib/core` (API client, models, app state, web sign-in), `lib/ui` (theme, glass controls, images), `lib/screens` (site pages, menu, bell, onboarding),
`lib/pages` (dashboard).

## Following the Design page

`GET /api/app/v1/config` also carries the site's campaign layout (grid, large, compact, mosaic, list: `lib/screens/campaign_layouts.dart`) and the cover text
choices (`lib/screens/campaign_card.dart`), and the onboarding tour (`lib/screens/ob_tour.dart`) is the site's walk through the dashboard with a picture of each page.
