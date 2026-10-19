# scroll (Mac app)

The movie-trailers feed as a native Mac app: Apple's liquid glass (macOS 26 "Tahoe" or later), trailers that start by themselves one after another, setting up on first launch, sign in with Google, Discord or email.

## Build and run

Open `Scroll.xcodeproj` in Xcode 26 or later and press Run, or `./build.sh` for a Release build in `build/Scroll.app`.

## Share it, free (no Apple developer account)

```bash
./package.sh        # makes dist/scroll.zip and dist/scroll.dmg (about 2 MB, for Apple Silicon and Intel Macs)
```

The app is signed "ad hoc" (free, works on any Mac), not notarized (notarizing costs $99 a year). That only changes how a Mac treats the first opening:

1. **Easiest for people:** send them `scroll.dmg` or `scroll.zip` (iCloud Drive, Dropbox, AirDrop, a GitHub release, anything). They drag **scroll** into Applications. The first time, macOS says it cannot verify the app: open **System Settings > Privacy & Security**, scroll down and press **Open Anyway** (once only).
2. **No warning at all:** host `scroll.zip` anywhere with a direct link and give them one line to paste into Terminal. Files downloaded by `curl` are not flagged, so the app just opens:
   ```bash
   curl -L "https://YOUR-LINK/scroll.zip" -o /tmp/scroll.zip && unzip -qo /tmp/scroll.zip -d /Applications && open /Applications/scroll.app
   ```
3. **Free places to put the file:** a GitHub release (Releases > Draft a new release > attach `scroll.zip`; the repo must be public for others to download), or this site's own `public/` folder (then the link is `https://scroll.logoless.io/scroll.zip`).

Needs macOS 26 or later (the glass is Apple's own and only exists there).

## YouTube

Trailers play from YouTube's own player. On a VPN, an office or any shared network YouTube may ask for a sign-in ("Sign in to confirm you're not a bot") before it plays anything. The app detects this, says so, and has a **Sign in to YouTube** button (also in Settings) that signs in once, in the app, and remembers it. Turning the VPN off has the same effect.
