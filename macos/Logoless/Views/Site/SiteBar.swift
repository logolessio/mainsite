import SwiftUI

/// The bar that floats over every page of the site: the mark on the left; the bell, Dashboard, you and the menu on the right.
struct SiteBar: View {
    @Environment(AppModel.self) private var app
    @Environment(\.compact) private var compact

    var body: some View {
        HStack(spacing: 10) {
            Button { app.go(.home) } label: {
                Image("Mark").renderingMode(.template).resizable().scaledToFit().frame(width: 50, height: 38).foregroundStyle(Color.paper)
            }
            .buttonStyle(.plain)
            .help("Home")
            .padding(.leading, compact ? 14 : 78)

            Spacer(minLength: 12)

            if app.isSignedIn {
                GlassCircle(symbol: "bell", dot: app.unread > 0, help: "Notifications") { withAnimation(Motion.panel) { app.showBell.toggle(); app.showMenu = false } }
                PaperPill("Dashboard", height: compact ? 38 : 40) { app.go(.dash(.overview)) }
                Button { app.go(.dash(.profile)) } label: { Avatar(url: app.me?.avatarURL, name: app.me?.profile?.displayName ?? "L", size: 40) }
                    .buttonStyle(.plain)
                    .help("Your profile")
            } else if app.phase != .starting {
                GhostPill("Log in", height: 40) { Task { await app.signIn() } }
                PaperPill("Get started", busy: app.signingIn, height: 40) { app.beginOnboarding() }
            }
            GlassCircle(symbol: app.showMenu ? "xmark" : "line.3.horizontal", help: app.showMenu ? "Close the menu" : "Menu") { withAnimation(Motion.panel) { app.showMenu.toggle(); app.showBell = false } }
        }
        .padding(.trailing, compact ? 14 : 24)
        .padding(.top, compact ? 6 : 14)
        .frame(height: 70, alignment: .top)
    }
}

struct Avatar: View {
    let url: URL?
    let name: String
    var size: CGFloat = 36

    /// The ready-made looks (/api/look/<id>?l=L) are drawn here from the look's colours, as the site draws them.
    private var look: (Look, String)? {
        guard let url, url.path.hasPrefix("/api/look/") else { return nil }
        let id = String(url.path.dropFirst("/api/look/".count))
        let letter = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "l" })?.value ?? String(name.prefix(1))
        return (Looks.byID(id) ?? Looks.forSeed(name), letter)
    }

    var body: some View {
        ZStack {
            if let (l, letter) = look { LookArt(look: l, kind: .avatar, letter: letter) }
            else if let url { RemoteImage(url: url, seed: name) }
            else { LookArt(look: Looks.forSeed(name), kind: .avatar, letter: String(name.prefix(1))) }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(Color.white.opacity(0.15)))
    }
}
